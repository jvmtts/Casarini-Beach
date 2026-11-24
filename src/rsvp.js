const answers = new Set(['Sim', 'Não']);
const phonePattern = /^\+?[\d\s().-]+$/u;
const emailPattern = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/u;

export const navigationTerms = {
  version: '2026-11-24',
  title: 'Termo de ciência do encontro de navegação',
  paragraphs: [
    'O encontro de 05/12/2026 é um passeio recreativo entre amigos, de participação voluntária. O ponto de encontro, o trajeto e o horário de retorno são referências para os participantes.',
    'Cabe a cada proprietário ou condutor, conforme suas atribuições, conferir e manter em ordem a documentação da embarcação ou moto aquática (jet ski), a habilitação exigida e os equipamentos de segurança aplicáveis.',
    'A atuação da Casarini neste encontro consiste em divulgar as informações do passeio. A decisão de participar cabe a cada convidado, e cada condutor é responsável pela navegação da embarcação que conduz. Aplicam-se as responsabilidades previstas em lei.',
  ],
  label: 'Li e aceito as condições do encontro de navegação de 05/12.',
  requiredMessage: 'Leia e aceite o termo para confirmar sua participação no encontro de navegação.',
};

export function needsNavigationConsent(values) {
  return values?.saturday === 'Sim' && values.navigationAccepted !== true;
}

const messages = {
  'navigation-consent-required': navigationTerms.requiredMessage,
  unavailable: 'As confirmações ainda não estão abertas.',
  invalid: 'Revise seus dados e responda às duas perguntas.',
  'rate-limit': 'Aguarde alguns instantes e tente novamente.',
  rejected: 'Não foi possível registrar sua resposta. Revise os dados e tente novamente.',
  unexpected: 'Não conseguimos confirmar o envio agora. Tente novamente em instantes.',
  network: 'Não conseguimos confirmar o envio. Verifique sua conexão e tente novamente.',
};

function submissionError(code) {
  return Object.assign(new Error(messages[code]), { code });
}

export function basinEndpoint(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value.trim());
    if (url.origin !== 'https://usebasin.com' || url.username || url.password ||
      url.search || url.hash || !/^\/f\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname)) return null;

    return url.origin + url.pathname.replace(/\/$/, '');
  } catch {
    return null;
  }
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeContact(values) {
  return {
    name: clean(values?.name).replace(/\s+/gu, ' '),
    phone: clean(values?.phone),
    email: clean(values?.email).toLowerCase(),
  };
}

export function contactErrors(values) {
  const { name, phone, email } = normalizeContact(values);
  const errors = {};
  if (name.length < 2 || name.length > 120 || !/\p{L}/u.test(name) || /[\x00-\x1f\x7f]/u.test(name)) {
    errors.name = 'Digite seu nome completo.';
  }
  if (phone.length > 28 || !phonePattern.test(phone) || !/^\d{10,15}$/.test(phone.replace(/\D/g, ''))) {
    errors.phone = 'Digite um telefone com DDD ou código do país.';
  }
  if (email.length > 254 || !emailPattern.test(email)) {
    errors.email = 'Digite um e-mail válido.';
  }
  return errors;
}

export async function submitRsvp(value, values, request = fetch) {
  const endpoint = basinEndpoint(value);
  if (!endpoint) throw submissionError('unavailable');
  if (Object.keys(contactErrors(values)).length || !answers.has(values.friday) || !answers.has(values.saturday)) {
    throw submissionError('invalid');
  }

  if (needsNavigationConsent(values)) throw submissionError('navigation-consent-required');

  const body = new FormData();
  for (const [key, field] of Object.entries({
    ...normalizeContact(values),
    reinauguracao_sexta: values.friday,
    navegacao_sabado: values.saturday,
  })) {
    body.append(key, field);
  }

  if (values.saturday === 'Sim') {
    body.append('termo_navegacao_aceito', 'Sim');
    body.append('termo_navegacao_versao', navigationTerms.version);
  }

  let response;
  try {
    response = await request(endpoint, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body,
      credentials: 'omit',
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw submissionError('network');
  }

  if (response.status === 429) throw submissionError('rate-limit');
  if (!response.ok) throw submissionError('rejected');

  const data = await response.json().catch(() => null);
  if (data?.success === false || data?.error) throw submissionError('rejected');
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw submissionError('unexpected');
}
