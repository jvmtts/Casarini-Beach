import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { AttendanceForm } from './AttendanceForm.jsx';
import { basinEndpoint } from './rsvp.js';

const contourPaths = [
  'M-110 321 C 36 297 143 246 231 191 S 383 176 474 138 S 635 32 860 28',
  'M-102 356 C 45 331 161 282 251 228 S 403 208 493 171 S 649 68 872 62',
  'M-95 392 C 52 367 179 320 271 264 S 424 241 513 203 S 665 101 885 97',
  'M-86 429 C 62 404 198 355 292 301 S 444 273 533 237 S 680 135 899 131',
  'M-76 463 C 74 438 214 392 314 338 S 466 305 553 269 S 695 168 914 166',
];

const entrance = {
  resting: {},
  reveal: { transition: { staggerChildren: 0.08 } },
};

const entrancePart = {
  resting: { opacity: 0, y: 12 },
  reveal: { opacity: 1, y: 0, transition: { duration: 0.52, ease: [0.2, 0.7, 0.25, 1] } },
};

const titleEntrance = {
  resting: { ...entrancePart.resting, filter: 'blur(5px)' },
  reveal: { ...entrancePart.reveal, filter: 'blur(0px)' },
};

const confirmationIntro = {
  resting: { opacity: 0.42, y: 23 },
  reveal: { opacity: 1, y: 0, transition: { duration: 0.58, ease: [0.17, 0.7, 0.24, 1] } },
};

const formEntrance = {
  resting: { opacity: 0.24, y: 34, scale: 0.977, rotateX: -5, transformPerspective: 1050 },
  reveal: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: { duration: 0.7, ease: [0.17, 0.7, 0.22, 1], opacity: { duration: 0.49 } },
  },
};

function Brand({ small = false }) {
  return (
    <div className={small ? 'brand brand-small' : 'brand'}>
      <img src="/assets/casarini.png" alt="Casarini" width="1080" height="1350" loading={small ? 'lazy' : 'eager'} />
    </div>
  );
}

function Contours({ placement, active }) {
  const id = useId();
  return (
    <svg className={'contours contours-' + placement} viewBox="0 0 840 410" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id + '-edge'} x1="0%" x2="100%">
          <stop offset="0%" stopColor="#5b4731" stopOpacity=".5" />
          <stop offset="48%" stopColor="#ad8955" stopOpacity=".62" />
          <stop offset="100%" stopColor="#57432d" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g className={active ? 'contour-lines is-active' : 'contour-lines'}>
        <g transform="translate(0 3)" stroke="#000" strokeOpacity=".55" strokeWidth="3.2">
          {contourPaths.map((d) => <path key={d} d={d} />)}
        </g>
        <g stroke={`url(#${id}-edge)`} strokeWidth="1.1">
          {contourPaths.map((d) => <path key={d} d={d} />)}
        </g>
        <g className="contour-light" stroke="#d6ad6e" strokeWidth="1.35">
          {contourPaths.map((d, index) => (
            <path key={d} className={'contour-glint glint-' + index} d={d} pathLength="100" />
          ))}
        </g>
      </g>
    </svg>
  );
}

function Ribbon({ playing, staticArt }) {
  const video = useRef(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const clip = video.current;
    if (!clip) return;
    if (!playing) {
      clip.pause();
      return;
    }

    clip.playbackRate = window.matchMedia('(width < 48rem)').matches ? 0.85 : 1;
    clip.play().catch((error) => {
      if (error.name === 'NotSupportedError') setUnavailable(true);
    });
  }, [playing, staticArt]);

  return (
    <div className={staticArt ? 'ribbon-depth ribbon-depth-static' : 'ribbon-depth'} aria-hidden="true">
      {staticArt || unavailable ? (
        <img className="hero-ribbon" src={staticArt ? '/assets/fita.webp' : '/assets/fita-poster.webp'} alt="" fetchPriority="high" />
      ) : (
        <video
          ref={video}
          className="hero-ribbon"
          src="/assets/fita-loop.mp4"
          poster="/assets/fita-poster.webp"
          preload="none"
          muted
          playsInline
          loop
          disablePictureInPicture
          onError={() => setUnavailable(true)}
        />
      )}
    </div>
  );
}

function ConfirmationPanel({ endpoint, effectsEnabled }) {
  const panel = useRef(null);
  const seen = useInView(panel, { once: true, amount: 0.24 });
  const ready = seen || !effectsEnabled;

  return (
    <motion.div
      ref={panel}
      className={effectsEnabled && seen ? 'rsvp-form-entry is-revealed' : 'rsvp-form-entry'}
      variants={formEntrance}
      initial={effectsEnabled ? 'resting' : false}
      animate={ready ? 'reveal' : 'resting'}
    >
      <AttendanceForm endpoint={endpoint} visible={ready} />
    </motion.div>
  );
}

export function App() {
  const hero = useRef(null);
  const rsvp = useRef(null);
  const rsvpTitle = useRef(null);
  const [formOpen, setFormOpen] = useState(false);
  const [tabVisible, setTabVisible] = useState(() => !document.hidden);
  const reduceMotion = useReducedMotion();
  const heroVisible = useInView(hero, { initial: true, amount: 0.2 });
  const formVisible = useInView(rsvp, { amount: 0.15 });
  const effectsEnabled = !reduceMotion;
  const heroMoving = effectsEnabled && tabVisible && heroVisible;
  const endpoint = basinEndpoint(import.meta.env.VITE_BASIN_ENDPOINT);

  const focusForm = useCallback(() => {
    rsvpTitle.current?.focus({ preventScroll: true });
    rsvp.current?.scrollIntoView({ block: 'start' });
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => setTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useEffect(() => {
    if (formOpen) focusForm();
  }, [formOpen, focusForm]);

  function showForm() {
    if (formOpen) focusForm();
    else setFormOpen(true);
  }

  return (
    <>
      <main>
        <section ref={hero} className="hero relative isolate grid min-h-[max(43rem,94svh)] overflow-clip max-md:min-h-[max(38rem,92svh)]" aria-labelledby="convite-titulo">
          <Ribbon playing={heroMoving} staticArt={reduceMotion} />
          <div className="hero-shade" aria-hidden="true" />
          <Contours placement="hero" active={heroMoving} />

          <div className="frame z-10 grid grid-rows-[auto_1fr]">
            <header className="flex min-h-[5.6rem] items-center border-b border-gold/20 max-md:min-h-[4.6rem]">
              <Brand />
            </header>

            <motion.div className="invitation-copy self-center" variants={entrance} initial={reduceMotion ? false : 'resting'} animate="reveal">
              <motion.p className="invitation-greeting" variants={entrancePart}>
                <img src="/assets/convite/saudacao.png" alt="É uma honra convidá-los para a" width="518" height="30" />
              </motion.p>
              <motion.p className="invitation-script" variants={titleEntrance}>
                <img src="/assets/convite/reinauguracao.png" alt="Reinauguração" width="876" height="155" />
              </motion.p>
              <motion.h1 id="convite-titulo" className="invitation-title" variants={entrancePart}>
                <img src="/assets/convite/casarini-beach.png" alt="Casarini Beach" width="677" height="38" />
              </motion.h1>
              <motion.p className="invitation-unit" variants={entrancePart}>
                <img src="/assets/convite/unidade-guaruja.png" alt="Loja · Unidade Guarujá" width="526" height="25" />
              </motion.p>
              <motion.time className="invitation-date" dateTime="2026-12-04T18:00:00-03:00" variants={entrancePart}>
                <span className="sr-only">Sexta-feira, 4 de dezembro de 2026 às 18h</span>
                <span className="invitation-date-primary" aria-hidden="true">
                  <img src="/assets/convite/dia.png" alt="04" width="162" height="109" />
                  <span className="invitation-date-month">
                    <img src="/assets/convite/mes-ano.png" alt="Dezembro de 2026" width="219" height="76" />
                  </span>
                </span>
                <span className="invitation-date-hour" aria-hidden="true">
                  <img src="/assets/convite/dia-horario-18h.png" alt="Sexta-feira às 18h" width="257" height="73" />
                </span>
              </motion.time>
              <motion.address className="invitation-address" variants={entrancePart}>
                <img src="/assets/convite/endereco.png" alt="Estrada do Pernambuco, 90. Enseada, Guarujá–SP." width="462" height="61" />
              </motion.address>
              <motion.button
                type="button"
                className="button button-gold mt-8"
                aria-expanded={formOpen}
                aria-controls="confirmar"
                onClick={showForm}
                variants={entrancePart}
                whileTap={{ scale: 0.98 }}
              >
                Confirmar presença
              </motion.button>
            </motion.div>
          </div>
        </section>

        <section ref={rsvp} id="confirmar" hidden={!formOpen} className="rsvp-section relative isolate overflow-clip border-t border-gold/20" aria-labelledby="rsvp-titulo">
          {formOpen && (
            <>
              <Contours placement="rsvp" active={effectsEnabled && formVisible} />
              <div className={effectsEnabled && formVisible ? 'rsvp-lit-rule is-revealed' : 'rsvp-lit-rule'} aria-hidden="true" />
              <div className="frame grid items-start gap-[clamp(2rem,6vw,6rem)] py-[clamp(4.25rem,9vw,8.75rem)] md:grid-cols-[minmax(0,.86fr)_minmax(0,1.14fr)]">
                <motion.header
                  className="md:pt-4"
                  variants={confirmationIntro}
                  initial={effectsEnabled ? 'resting' : 'reveal'}
                  whileInView="reveal"
                  viewport={{ once: true, amount: 0.3 }}
                >
                  <div aria-hidden="true" className="mb-5 h-px w-12 bg-gold" />
                  <h2 ref={rsvpTitle} tabIndex={-1} id="rsvp-titulo" className="invite-heading text-[clamp(3.4rem,7vw,7.4rem)] focus:outline-none">Confirme sua<br className="hidden md:block" /> presença.</h2>
                  <p className="mt-6 max-w-96 text-muted max-md:mt-4">Você é nosso convidado. Conte pra gente em quais eventos vai participar.</p>
                </motion.header>
                <ConfirmationPanel endpoint={endpoint} effectsEnabled={effectsEnabled} />
              </div>
            </>
          )}
        </section>
      </main>
      <footer className="border-t border-stroke bg-ink text-muted">
        <div className="frame grid min-h-20 grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 py-4 text-sm sm:min-h-24 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <Brand small />
          <small className="col-span-2 col-start-1 row-start-2 text-center text-xs text-muted/75 sm:col-span-1 sm:col-start-2 sm:row-start-1">
            Produzido pela Usina do Jet
          </small>
          <span className="col-start-2 row-start-1 justify-self-end text-right sm:col-start-3">Casarini Beach · Unidade Guarujá</span>
        </div>
      </footer>
    </>
  );
}
