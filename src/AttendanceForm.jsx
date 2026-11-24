import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { contactErrors, navigationTerms, needsNavigationConsent, submitRsvp } from './rsvp.js';

const fields = [
  { name: 'name', label: 'Nome completo', type: 'text', autoComplete: 'name', maxLength: 120, placeholder: 'Seu nome completo' },
  { name: 'phone', label: 'Telefone', type: 'tel', autoComplete: 'tel', maxLength: 28, placeholder: '(00) 00000-0000' },
  { name: 'email', label: 'E-mail', type: 'email', autoComplete: 'email', maxLength: 254, placeholder: 'seu@email.com' },
];

const questions = [
  {
    name: 'friday',
    label: 'Posso confirmar sua presença na reinauguração da Casarini Beach no dia 04/12?',
    event: 'Reinauguração · Sexta-feira',
    details: [
      'O coquetel começa às 18h.',
      'Estrada do Pernambuco, 90, Enseada, Guarujá–SP.',
    ],
  },
  {
    name: 'saturday',
    label: 'Você vai participar do encontro de navegação da Casarini no sábado dia 05/12?',
    event: 'Encontro de navegação · Sábado',
    detailsHeading: 'Como vai funcionar?',
    details: [
      'Ponto de encontro a partir das 9h na Praia da Enseada, no Guarujá.',
      'O trajeto previsto é contornar a ilha.',
      'Retorno previsto às 14h30.',
    ],
  },
];

const empty = { name: '', phone: '', email: '', friday: '', saturday: '', navigationAccepted: false };
const ease = [0.22, 0.76, 0.25, 1];
const scene = {
  waiting: {},
  visible: { transition: { staggerChildren: 0.055 } },
  exit: { opacity: 0, y: -5, transition: { duration: 0.1 } },
};
const stagger = {
  waiting: { opacity: 0.4, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.34, ease } },
};

function Choice({ name, value, checked, onChange }) {
  return (
    <motion.label className="choice relative min-w-0" whileTap={{ scale: 0.975 }}>
      <input className="sr-only" type="radio" name={name} value={value} checked={checked} onChange={onChange} required />
      <span className="choice-face">{value}</span>
    </motion.label>
  );
}

export function AttendanceForm({ endpoint, visible }) {
  const [phase, setPhase] = useState('contact');
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState('');
  const [sending, setSending] = useState(false);
  const [touched, setTouched] = useState(false);
  const moved = useRef(false);
  const locked = useRef(false);
  const reduced = useReducedMotion();

  const focusHeading = useCallback((node) => {
    if (!node || !moved.current) return;
    node.focus({ preventScroll: true });
    const { top } = node.getBoundingClientRect();
    if (top < 24 || top > window.innerHeight - 90) node.scrollIntoView({ block: 'start' });
  }, []);

  function changePhase(next) {
    moved.current = true;
    setFeedback('');
    setPhase(next);
  }

  function update(event) {
    const { name, type, value, checked } = event.target;
    setValues((current) => {
      const next = { ...current, [name]: type === 'checkbox' ? checked : value };
      if (name === 'saturday') next.navigationAccepted = false;
      return next;
    });
    if (errors[name]) setErrors((current) => ({ ...current, [name]: '' }));
    if (feedback) setFeedback('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (locked.current) return;

    if (phase === 'contact') {
      const contact = Object.fromEntries(new FormData(event.currentTarget));
      const invalid = contactErrors(contact);
      const first = Object.keys(invalid)[0];
      setErrors(invalid);
      if (first) {
        event.currentTarget.elements.namedItem(first)?.focus();
        return;
      }
      setValues((current) => ({ ...current, ...contact }));
      changePhase('attendance');
      return;
    }

    if (!endpoint) return;
    const missing = questions.find(({ name }) => !values[name]);
    if (missing) {
      setFeedback('Escolha Sim ou Não para cada evento.');
      event.currentTarget.querySelector(`input[name="${missing.name}"]`)?.focus();
      return;
    }

    if (needsNavigationConsent(values)) {
      setFeedback(navigationTerms.requiredMessage);
      event.currentTarget.elements.namedItem('navigationAccepted')?.focus();
      return;
    }

    locked.current = true;
    setSending(true);
    setFeedback('');
    try {
      await submitRsvp(endpoint, values);
      changePhase('complete');
    } catch (error) {
      setFeedback(error.message);
    } finally {
      locked.current = false;
      setSending(false);
    }
  }

  const navigationError = feedback === navigationTerms.requiredMessage;
  const current = phase === 'contact' ? 1 : 2;
  const revealed = reduced || visible || touched || phase !== 'contact';

  return (
    <motion.div
      className="flow-panel relative min-w-0 rounded-xl border border-stroke bg-surface p-[clamp(1.35rem,3.7vw,3.25rem)]"
      layout={reduced ? false : 'size'}
      transition={{ layout: { duration: 0.38, ease } }}
      onFocusCapture={() => setTouched(true)}
    >
      {phase !== 'complete' && (
        <div className="mb-5 flex items-center justify-between gap-4 text-sm font-extrabold text-gold">
          <span id="form-progress">Etapa {current} de 2</span>
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="h-[3px] w-8 rounded-full bg-gold" />
            <span className={`h-[3px] w-8 rounded-full motion-safe:transition-colors ${current === 2 ? 'bg-gold' : 'bg-stroke'}`} />
          </span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {phase === 'complete' ? (
          <motion.div key="complete" variants={scene} initial={reduced ? false : 'waiting'} animate="visible" exit="exit" layout="position">
            <motion.div variants={stagger} className="success-mark" aria-hidden="true" />
            <motion.h3 ref={focusHeading} className="step-title mb-2" tabIndex={-1} variants={stagger}>Resposta registrada.</motion.h3>
            <motion.p className="text-muted" variants={stagger}>Obrigado por responder ao convite.</motion.p>
            <motion.dl className="mt-6" variants={stagger}>
              {questions.map(({ name, event }) => (
                <div key={name} className="border-t border-stroke py-2.5">
                  <dt className="text-sm text-muted">{event}</dt>
                  <dd className="font-extrabold text-gold">{values[name] === 'Sim' ? 'Vou participar' : 'Não vou participar'}</dd>
                </div>
              ))}
            </motion.dl>
          </motion.div>
        ) : (
          <motion.form
            key={phase}
            noValidate
            onSubmit={handleSubmit}
            variants={scene}
            initial={reduced ? false : 'waiting'}
            animate={revealed ? 'visible' : 'waiting'}
            exit="exit"
            layout="position"
          >
            <motion.h3 ref={focusHeading} tabIndex={-1} aria-describedby="form-progress" className="step-title" variants={stagger}>
              {phase === 'contact' ? 'Seus dados' : 'Sua presença'}
            </motion.h3>

            {phase === 'contact' ? (
              <>
                {fields.map(({ name, label, ...field }) => (
                  <motion.div key={name} className="mb-4 grid gap-1.5" variants={stagger}>
                    <div className="relative">
                      <input
                        {...field}
                        id={name}
                        name={name}
                        className="field-input"
                        value={values[name]}
                        onChange={update}
                        aria-invalid={Boolean(errors[name])}
                        aria-describedby={errors[name] ? name + '-error' : undefined}
                        required
                      />
                      <label className="field-label" htmlFor={name}>{label}</label>
                    </div>
                    {errors[name] && <p id={name + '-error'} className="text-sm text-danger">{errors[name]}</p>}
                  </motion.div>
                ))}
                <motion.button type="submit" className="button button-gold mt-2 w-full" variants={stagger} whileTap={{ scale: 0.985 }}>
                  Continuar
                </motion.button>
                <motion.p className="mt-3 text-sm text-muted" variants={stagger}>Usamos seus dados para organizar a presença nos eventos.</motion.p>
              </>
            ) : (
              <>
                {questions.map(({ name, label, detailsHeading, details }) => (
                  <motion.fieldset
                    key={name}
                    className="mb-6 min-w-0"
                    aria-describedby={name + '-details'}
                    disabled={sending}
                    variants={stagger}
                  >
                    <legend className="mb-2.5 font-bold leading-snug">{label}</legend>
                    <div id={name + '-details'} className="mb-3 space-y-1.5 text-sm leading-relaxed text-muted">
                      {detailsHeading && <p className="font-bold text-paper/90">{detailsHeading}</p>}
                      <ul className="space-y-1" role="list">
                        {details.map((line) => (
                          <li key={line} className="flex gap-2">
                            <span aria-hidden="true" className="shrink-0 text-gold">*</span>
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {['Sim', 'Não'].map((value) => (
                        <Choice key={value} name={name} value={value} checked={values[name] === value} onChange={update} />
                      ))}
                    </div>
                  </motion.fieldset>
                ))}
                <AnimatePresence initial={false}>
                  {values.saturday === 'Sim' && (
                    <motion.section
                      key="navigation-terms"
                      aria-labelledby="navigation-terms-title"
                      className="mb-5 rounded-lg border border-gold/35 bg-ink/35 p-4 sm:p-5"
                      initial={reduced ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduced ? undefined : { opacity: 0, transition: { duration: 0.12 } }}
                      transition={{ duration: 0.25, ease }}
                    >
                      <h4 id="navigation-terms-title" className="font-display text-2xl leading-tight text-gold">
                        {navigationTerms.title}
                      </h4>
                      <div className="mt-3 space-y-2.5 text-sm leading-relaxed text-muted">
                        {navigationTerms.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                      </div>
                      <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-stroke bg-surface px-3 py-2.5 text-sm font-bold leading-snug">
                        <input
                          type="checkbox"
                          name="navigationAccepted"
                          className="size-4 shrink-0 accent-gold"
                          checked={values.navigationAccepted}
                          onChange={update}
                          disabled={sending}
                          aria-invalid={navigationError}
                          aria-describedby={navigationError ? 'attendance-feedback' : undefined}
                          required
                        />
                        {navigationTerms.label}
                      </label>
                    </motion.section>
                  )}
                </AnimatePresence>
                {!endpoint && <p className="mb-4 text-sm text-muted">As confirmações ainda não estão abertas.</p>}
                {feedback && <p id="attendance-feedback" role="alert" className="mb-4 text-sm text-danger">{feedback}</p>}
                <motion.div className="grid grid-cols-[auto_1fr] gap-2.5" variants={stagger}>
                  <button type="button" className="button button-back" onClick={() => changePhase('contact')} disabled={sending}>Voltar</button>
                  <motion.button
                    type="submit"
                    className="button button-gold"
                    disabled={sending || !endpoint}
                    whileTap={{ scale: 0.985 }}
                  >
                    {sending ? 'Enviando…' : 'Enviar respostas'}
                  </motion.button>
                </motion.div>
                <span role="status" className="sr-only">{sending ? 'Enviando respostas.' : ''}</span>
              </>
            )}
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
