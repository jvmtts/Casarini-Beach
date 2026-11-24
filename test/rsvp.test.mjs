import assert from 'node:assert/strict';
import test from 'node:test';
import { basinEndpoint, contactErrors, submitRsvp } from '../src/rsvp.js';

const endpoint = 'https://usebasin.com/f/abcdef123456';
const draft = {
  name: '  Maria   da Silva ',
  phone: '+55 (13) 99999-9999',
  email: ' Maria@example.com ',
  friday: 'Não',
  saturday: 'Sim',
  navigationAccepted: true,
};

test('aceita só o endpoint público de um formulário do Basin', () => {
  assert.equal(basinEndpoint(' ' + endpoint + '/ '), endpoint);
  for (const invalid of ['', 'https://fake.example/f/abc', endpoint + '?token=abc',
    'https://usebasin.com@fake.example/f/abc', 'http://usebasin.com/f/abc', 'https://usebasin.com/api/v1/forms']) {
    assert.equal(basinEndpoint(invalid), null);
  }
});

test('valida os três campos de contato e aceita telefone internacional', () => {
  assert.deepEqual(contactErrors(draft), {});
  assert.deepEqual(Object.keys(contactErrors({ name: '12', phone: '1199-5a', email: 'teste@local' })),
    ['name', 'phone', 'email']);
});

test('envia os dois eventos separadamente e confirma só depois de receber JSON de sucesso', async () => {
  await submitRsvp(endpoint, draft, async (url, options) => {
    assert.equal(url, endpoint);
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Accept, 'application/json');
    assert.equal(options.redirect, 'error');
    assert.deepEqual(Object.fromEntries(options.body), {
      name: 'Maria da Silva', phone: '+55 (13) 99999-9999', email: 'maria@example.com',
      reinauguracao_sexta: 'Não', navegacao_sabado: 'Sim',
      termo_navegacao_aceito: 'Sim', termo_navegacao_versao: '2026-11-24',
    });
    return Response.json({ redirect_url: endpoint + '/success' });
  });
});

test('mantém o formulário em caso de configuração ausente, rejeição, falha de rede ou resposta inesperada', async () => {
  const unusedFetch = () => assert.fail('Uma resposta inválida não deve sair do navegador.');
  await assert.rejects(submitRsvp('', draft, unusedFetch), { code: 'unavailable' });
  await assert.rejects(submitRsvp(endpoint, { ...draft, saturday: '' }, unusedFetch), { code: 'invalid' });
  await assert.rejects(submitRsvp(endpoint, draft, async () => Response.json({ success: false })), { code: 'rejected' });
  await assert.rejects(submitRsvp(endpoint, draft, async () => Response.json({}, { status: 429 })), { code: 'rate-limit' });
  await assert.rejects(submitRsvp(endpoint, draft, async () => new Response('<html></html>')), { code: 'unexpected' });
  await assert.rejects(submitRsvp(endpoint, draft, async () => { throw new TypeError('fetch failed'); }), { code: 'network' });
});

test('exige aceite explícito antes de enviar presença no encontro de navegação', async () => {
  const unusedFetch = () => assert.fail('O formulário de sábado saiu sem o aceite.');
  for (const navigationAccepted of [undefined, false, 'Sim']) {
    await assert.rejects(submitRsvp(endpoint, { ...draft, navigationAccepted }, unusedFetch),
      { code: 'navigation-consent-required' });
  }
});

test('envia uma recusa do sábado sem incluir os campos de aceite', async () => {
  await submitRsvp(endpoint, { ...draft, friday: 'Sim', saturday: 'Não' }, async (_url, options) => {
    assert.equal(options.body.get('reinauguracao_sexta'), 'Sim');
    assert.equal(options.body.get('navegacao_sabado'), 'Não');
    assert.equal(options.body.has('termo_navegacao_aceito'), false);
    assert.equal(options.body.has('termo_navegacao_versao'), false);
    return Response.json({ redirect_url: endpoint + '/success' });
  });
});
