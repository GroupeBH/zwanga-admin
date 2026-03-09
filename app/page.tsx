"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  ArrowRight,
  BellRing,
  Car,
  CheckCircle2,
  Clock3,
  Menu,
  MessageSquare,
  Minus,
  Navigation,
  PhoneCall,
  Plus,
  Shield,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import styles from "./home.module.css";

type Benefit = {
  title: string;
  description: string;
};

type Faq = {
  question: string;
  answer: string;
};

type SupportTag = {
  label: string;
  value: string;
};

const passengerBenefits: Benefit[] = [
  {
    title: "Recherche rapide de trajets",
    description:
      "Trouvez un covoiturage Kinshasa disponible selon votre zone, votre heure et votre besoin.",
  },
  {
    title: "Reservation en quelques clics",
    description:
      "Choisissez votre conducteur, confirmez votre place et suivez la course depuis l'application de transport.",
  },
  {
    title: "Plus de confiance au quotidien",
    description:
      "Messagerie, suivi en direct, avis et signalement pour un trajet securise de bout en bout.",
  },
];

const driverBenefits: Benefit[] = [
  {
    title: "Publiez vos trajets quotidiens",
    description:
      "Proposez vos places libres et organisez vos departs simplement depuis votre mobile.",
  },
  {
    title: "Gerez les demandes facilement",
    description:
      "Acceptez ou refusez les reservations en gardant le controle sur vos horaires.",
  },
  {
    title: "Conduisez avec les bons outils",
    description:
      "Navigation GPS, suivi en temps reel, notation des passagers et signalement en cas de souci.",
  },
];

const passengerSteps = [
  "Creez votre compte passager en quelques minutes.",
  "Recherchez un trajet selon votre destination.",
  "Reservez votre place et echangez avec le conducteur.",
  "Suivez la course, arrivez, puis notez le trajet.",
];

const driverSteps = [
  "Creez votre profil conducteur.",
  "Passez la verification d'identite (KYC).",
  "Publiez vos trajets et gerez les reservations.",
  "Lancez la navigation, terminez la course et notez le passager.",
];

const securityPoints = [
  {
    icon: UserCheck,
    title: "Verification d'identite",
    description: "KYC pour renforcer la confiance entre passager et conducteur.",
  },
  {
    icon: Navigation,
    title: "Suivi en temps reel",
    description: "Visualisez le trajet en direct pendant toute la course.",
  },
  {
    icon: BellRing,
    title: "Alertes et notifications",
    description: "Recevez les infos importantes de securite et de trajet.",
  },
  {
    icon: PhoneCall,
    title: "Contacts d'urgence",
    description: "Acces rapide depuis l'application en cas de besoin.",
  },
];

const supportFlow = [
  "1. Le passager ou conducteur cree un ticket avec sujet, categorie, priorite et premier message.",
  "2. Le ticket passe par les statuts open, in_progress, waiting_user, resolved, closed.",
  "3. Chaque message met a jour lastMessageAt et le premier retour support enregistre firstResponseAt.",
  "4. Les admins peuvent assigner, ajouter une note interne et une resolutionSummary.",
  "5. L'utilisateur peut fermer ou rouvrir un ticket selon l'avancement.",
];

const supportTags: { title: string; items: SupportTag[] }[] = [
  {
    title: "Statuts ticket",
    items: [
      { label: "Ouvert", value: "open" },
      { label: "En cours", value: "in_progress" },
      { label: "En attente user", value: "waiting_user" },
      { label: "Resolue", value: "resolved" },
      { label: "Ferme", value: "closed" },
    ],
  },
  {
    title: "Priorites",
    items: [
      { label: "Basse", value: "low" },
      { label: "Moyenne", value: "medium" },
      { label: "Haute", value: "high" },
      { label: "Urgente", value: "urgent" },
    ],
  },
  {
    title: "Categories",
    items: [
      { label: "General", value: "general" },
      { label: "Compte", value: "account" },
      { label: "Paiement", value: "payment" },
      { label: "Reservation", value: "booking" },
      { label: "Securite", value: "safety" },
      { label: "Technique", value: "technical" },
    ],
  },
];

const faqs: Faq[] = [
  {
    question: "Zwanga, c'est quoi exactement ?",
    answer:
      "Zwanga est une application de transport de covoiturage Kinshasa. Elle relie passagers et conducteurs pour les trajets urbains du quotidien.",
  },
  {
    question: "Comment reserver un trajet ?",
    answer:
      "Vous recherchez une offre, choisissez un conducteur et confirmez votre place en quelques clics.",
  },
  {
    question: "Comment devenir conducteur sur Zwanga ?",
    answer:
      "Inscrivez-vous, completez la verification d'identite, puis publiez vos trajets.",
  },
  {
    question: "Comment savoir si mon trajet est securise ?",
    answer:
      "Vous avez le profil verifie, les avis, le suivi en direct, les alertes et le systeme de signalement.",
  },
  {
    question: "Puis-je parler avec le conducteur avant le depart ?",
    answer: "Oui. La messagerie integree permet d'ecrire avant et pendant la course.",
  },
  {
    question: "Que faire en cas d'incident ?",
    answer:
      "Signalez immediatement depuis l'ecran de course ou ouvrez un ticket support. Notre equipe suit le dossier jusqu'a resolution.",
  },
  {
    question: "Quels statuts existent pour un ticket support ?",
    answer:
      "Votre ticket evolue entre open, in_progress, waiting_user, resolved et closed pour un suivi clair.",
  },
  {
    question: "Puis-je reouvrir un ticket ferme ou resolu ?",
    answer:
      "Oui. Vous pouvez rouvrir votre ticket depuis l'application si le probleme continue.",
  },
  {
    question: "Zwanga est disponible ou ?",
    answer: "Zwanga est centre sur Kinshasa pour offrir un service local adapte a la ville.",
  },
];

const previewImages = [
  {
    src: "/Screenshot_20251226_215934.png",
    alt: "Ecran accueil Zwanga",
  },
  {
    src: "/Screenshot_20251226_215948.png",
    alt: "Recherche de trajet Zwanga",
  },
  {
    src: "/Screenshot_20251226_220031.png",
    alt: "Reservation de place Zwanga",
  },
  {
    src: "/Screenshot_20251226_220124.png",
    alt: "Profil utilisateur Zwanga",
  },
  {
    src: "/Screenshot_20251226_220143.png",
    alt: "Historique de trajets Zwanga",
  },
  {
    src: "/Screenshot_20251226_220205.png",
    alt: "Parametres application Zwanga",
  },
];

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const androidAppUrl =
    process.env.NEXT_PUBLIC_ANDROID_APP_URL || "https://play.google.com/store/apps";
  const iosAppUrl = process.env.NEXT_PUBLIC_IOS_APP_URL || "https://apps.apple.com/";

  const goToDownloadSection = () => {
    const section = document.getElementById("download-apps");
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const goToHowItWorks = () => {
    const section = document.getElementById("how-it-works");
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleStartDownload = () => {
    const userAgent = navigator.userAgent || navigator.vendor;
    const isAndroid = /android/i.test(userAgent);
    const isIOS =
      /iPad|iPhone|iPod/.test(userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    if (isAndroid) {
      window.location.href = androidAppUrl;
      return;
    }

    if (isIOS) {
      window.location.href = iosAppUrl;
      return;
    }

    goToDownloadSection();
  };

  const toggleFaq = (index: number) => {
    setOpenFaq((current) => (current === index ? null : index));
  };

  const renderStoreButtons = () => (
    <div className={styles.appButtons}>
      <a href={androidAppUrl} className={styles.appBtn} aria-label="Telecharger sur Google Play">
        <Image
          src="/play-store.svg"
          alt=""
          width={26}
          height={26}
          className={styles.appBtnIcon}
          aria-hidden="true"
        />
        <span className={styles.appBtnLabel}>
          <span className={styles.appBtnLabelHint}>Disponible sur</span>
          <span className={styles.appBtnLabelName}>Google Play</span>
        </span>
      </a>
      <a href={iosAppUrl} className={styles.appBtn} aria-label="Telecharger sur App Store">
        <Image
          src="/apple.svg"
          alt=""
          width={24}
          height={24}
          className={`${styles.appBtnIcon} ${styles.appBtnIconApple}`}
          aria-hidden="true"
        />
        <span className={styles.appBtnLabel}>
          <span className={styles.appBtnLabelHint}>Telecharger dans l&apos;</span>
          <span className={styles.appBtnLabelName}>App Store</span>
        </span>
      </a>
    </div>
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.container}>
          <Link href="/" className={styles.logo}>
            <Image
              src="/zwanga.png"
              alt="ZWANGA Logo"
              width={40}
              height={40}
              className={styles.logoImage}
              priority
              style={{ background: "transparent" }}
            />
            <span>ZWANGA</span>
          </Link>
          <nav className={`${styles.nav} ${mobileMenuOpen ? styles.navOpen : ""}`}>
            <Link href="#benefits" onClick={() => setMobileMenuOpen(false)}>
              Avantages
            </Link>
            <Link href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>
              Comment ca marche
            </Link>
            <Link href="#security" onClick={() => setMobileMenuOpen(false)}>
              Securite
            </Link>
            <Link href="#support" onClick={() => setMobileMenuOpen(false)}>
              Support
            </Link>
            <Link href="#faq" onClick={() => setMobileMenuOpen(false)}>
              FAQ
            </Link>
          </nav>
          <button
            className={styles.mobileMenuBtn}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      <main>
        <section className={styles.hero} id="hero">
          <div className={styles.container}>
            <div className={styles.heroShell}>
              <div className={styles.heroText}>
                <span className={styles.eyebrow}>Covoiturage Kinshasa</span>
                <h1 className={styles.heroTitle}>Le covoiturage Kinshasa, simple, rapide et plus sur.</h1>
                <p className={styles.heroSubtitle}>
                  Zwanga est l&apos;application de transport qui connecte chaque passager a un
                  conducteur verifie pour un trajet securise au quotidien.
                </p>
                <div className={styles.heroActions}>
                  <button
                    type="button"
                    className={`${styles.primaryBtn} ${styles.primaryActionBtn}`}
                    onClick={handleStartDownload}
                  >
                    Trouver un trajet
                    <ArrowRight className={styles.btnIcon} />
                  </button>
                  <button type="button" className={styles.secondaryBtn} onClick={goToHowItWorks}>
                    Voir comment ca marche
                  </button>
                </div>
                {renderStoreButtons()}
                <a href="#benefits" className={styles.miniCta}>
                  Je suis passager ou conducteur
                </a>
              </div>

              <div className={styles.heroVisual}>
                <div className={styles.phoneGlow} />
                <div className={styles.phoneMockup}>
                  <div className={styles.phoneScreen}>
                    <Image
                      src="/Screenshot_20251226_215934.png"
                      alt="Zwanga application de transport a Kinshasa"
                      fill
                      className={styles.screenshot}
                      priority
                      sizes="(max-width: 768px) 240px, 300px"
                    />
                  </div>
                </div>

                <div className={`${styles.floatingCard} ${styles.floatingTop}`}>
                  <UserCheck size={18} />
                  <div>
                    <strong>Profil verifie</strong>
                    <span>Conducteur et passager</span>
                  </div>
                </div>

                <div className={`${styles.floatingCard} ${styles.floatingBottom}`}>
                  <Navigation size={18} />
                  <div>
                    <strong>Suivi en direct</strong>
                    <span>Votre trajet securise</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.trustStrip}>
              <p className={styles.trustItem}>
                <CheckCircle2 size={16} />
                Covoiturage Kinshasa pense pour la ville
              </p>
              <p className={styles.trustItem}>
                <Shield size={16} />
                Outils de securite pour chaque trajet
              </p>
              <p className={styles.trustItem}>
                <MessageSquare size={16} />
                Messagerie passager / conducteur incluse
              </p>
            </div>
          </div>
        </section>

        <section id="benefits" className={styles.section}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>Pourquoi choisir Zwanga ?</h2>
            <p className={styles.sectionSubtitle}>
              Une seule application de transport pour le passager et le conducteur.
            </p>

            <div className={styles.personaGrid}>
              <article className={styles.personaCard}>
                <div className={styles.personaHead}>
                  <Users className={styles.personaIcon} />
                  <h3>Benefices cles passager</h3>
                </div>
                <ul className={styles.featureList}>
                  {passengerBenefits.map((benefit) => (
                    <li key={benefit.title}>
                      <CheckCircle2 size={18} />
                      <div>
                        <h4>{benefit.title}</h4>
                        <p>{benefit.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <a href="#download-apps" className={styles.miniCta}>
                  Je suis passager, je commence
                </a>
              </article>

              <article className={styles.personaCard}>
                <div className={styles.personaHead}>
                  <Car className={styles.personaIcon} />
                  <h3>Benefices cles conducteur</h3>
                </div>
                <ul className={styles.featureList}>
                  {driverBenefits.map((benefit) => (
                    <li key={benefit.title}>
                      <CheckCircle2 size={18} />
                      <div>
                        <h4>{benefit.title}</h4>
                        <p>{benefit.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <a href="#download-apps" className={styles.miniCta}>
                  Devenir conducteur
                </a>
              </article>
            </div>
          </div>
        </section>

        <section id="how-it-works" className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>Comment ca marche</h2>
            <p className={styles.sectionSubtitle}>
              4 etapes pour le passager, 4 etapes pour le conducteur.
            </p>
            <div className={styles.howGrid}>
              <article className={styles.stepCard}>
                <div className={styles.personaHead}>
                  <Users className={styles.personaIcon} />
                  <h3>Parcours passager</h3>
                </div>
                <ol className={styles.stepsList}>
                  {passengerSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <a href="#download-apps" className={styles.miniCta}>
                  Trouver un trajet
                </a>
              </article>

              <article className={styles.stepCard}>
                <div className={styles.personaHead}>
                  <Car className={styles.personaIcon} />
                  <h3>Parcours conducteur</h3>
                </div>
                <ol className={styles.stepsList}>
                  {driverSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <a href="#download-apps" className={styles.miniCta}>
                  Publier un trajet
                </a>
              </article>
            </div>
          </div>
        </section>

        <section id="app-preview" className={styles.section}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>Apercu de l'application Zwanga</h2>
            <p className={styles.sectionSubtitle}>
              Une experience mobile locale pour reserver, suivre et finaliser votre course.
            </p>
            <div className={styles.previewGrid}>
              {previewImages.map((shot) => (
                <div key={shot.src} className={styles.previewCard}>
                  <Image
                    src={shot.src}
                    alt={shot.alt}
                    width={300}
                    height={600}
                    className={styles.previewImage}
                  />
                </div>
              ))}
            </div>
            <a href="#download-apps" className={styles.miniCta}>
              Installer l'application
            </a>
          </div>
        </section>

        <section id="security" className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.container}>
            <div className={styles.securityLayout}>
              <div className={styles.securityText}>
                <h2 className={styles.sectionTitleLeft}>Securite & confiance</h2>
                <p className={styles.sectionSubtitleLeft}>
                  Zwanga met la confiance au centre: verification d&apos;identite, suivi en direct,
                  alertes et contacts d&apos;urgence pour un trajet securise.
                </p>
                <a href="#download-apps" className={styles.miniCta}>
                  Voir nos mesures de securite
                </a>
              </div>
              <div className={styles.securityGrid}>
                {securityPoints.map((point) => (
                  <article key={point.title} className={styles.securityCard}>
                    <point.icon className={styles.securityIcon} />
                    <h3>{point.title}</h3>
                    <p>{point.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="support" className={styles.section}>
          <div className={styles.container}>
            <div className={styles.supportCard}>
              <div>
                <h2 className={styles.sectionTitleLeft}>Signalement & assistance</h2>
                <p className={styles.sectionSubtitleLeft}>
                  En cas de probleme, passager et conducteur peuvent signaler depuis
                  l&apos;application ou ouvrir un ticket support. Le suivi est structure du premier
                  message jusqu&apos;a la resolution.
                </p>
                <div className={styles.supportMeta}>
                  {supportTags.map((group) => (
                    <article key={group.title} className={styles.supportMetaCard}>
                      <h3>{group.title}</h3>
                      <div className={styles.supportTagList}>
                        {group.items.map((item) => (
                          <span key={item.value} className={styles.supportTag}>
                            {item.label}
                          </span>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
                <a href="#download-apps" className={styles.miniCta}>
                  Signaler ou demander de l'aide
                </a>
              </div>
              <ul className={styles.supportList}>
                {supportFlow.map((step) => (
                  <li key={step}>
                    <Clock3 size={18} />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="faq" className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>FAQ</h2>
            <p className={styles.sectionSubtitle}>
              Les reponses claires avant d&apos;installer Zwanga.
            </p>
            <div className={styles.faqList}>
              {faqs.map((faq, index) => (
                <article key={faq.question} className={styles.faqItem}>
                  <button
                    type="button"
                    className={styles.faqQuestion}
                    onClick={() => toggleFaq(index)}
                    aria-expanded={openFaq === index}
                  >
                    <span>{faq.question}</span>
                    {openFaq === index ? <Minus size={18} /> : <Plus size={18} />}
                  </button>
                  {openFaq === index ? <p className={styles.faqAnswer}>{faq.answer}</p> : null}
                </article>
              ))}
            </div>
            <a href="#download-apps" className={styles.miniCta}>
              Consulter plus de reponses
            </a>
          </div>
        </section>

        <section id="download-apps" className={styles.download}>
          <div className={styles.container}>
            <div className={styles.downloadShell}>
              <div className={styles.downloadText}>
                <span className={styles.eyebrow}>Pret a commencer ?</span>
                <h2 className={styles.downloadTitle}>
                  Faites vos trajets avec plus de confiance a Kinshasa.
                </h2>
                <p className={styles.downloadSubtitle}>
                  Installez Zwanga, choisissez votre profil passager ou conducteur, puis lancez
                  votre premier trajet securise.
                </p>
                <div className={styles.heroActions}>
                  <button
                    type="button"
                    className={`${styles.primaryBtn} ${styles.primaryActionBtn}`}
                    onClick={handleStartDownload}
                  >
                    Installer maintenant
                    <ArrowRight className={styles.btnIcon} />
                  </button>
                  <a href="#benefits" className={styles.secondaryBtn}>
                    Voir les avantages
                  </a>
                </div>
                {renderStoreButtons()}
                <a href="#hero" className={styles.miniCta}>
                  Revenir en haut de page
                </a>
              </div>
              <div className={styles.downloadVisual}>
                <div className={styles.phoneMockup}>
                  <div className={styles.phoneScreen}>
                    <Image
                      src="/Screenshot_20251226_215948.png"
                      alt="Ecran trajet Zwanga"
                      fill
                      className={styles.screenshot}
                      sizes="(max-width: 768px) 220px, 300px"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerContent}>
            <div className={styles.footerSection}>
              <Link href="/" className={styles.footerLogo}>
                <Image
                  src="/zwanga.png"
                  alt="ZWANGA Logo"
                  width={32}
                  height={32}
                  className={styles.footerLogoImage}
                  style={{ background: "transparent" }}
                />
                <span>ZWANGA</span>
              </Link>
              <p className={styles.footerText}>
                Zwanga est une application de transport de covoiturage Kinshasa pour passager et
                conducteur.
              </p>
              <div className={styles.socialLinks}>
                <a href="#" aria-label="Facebook">
                  <Image
                    src="/Facebook-f_Logo-Blue-Logo.wine.png"
                    alt=""
                    width={18}
                    height={18}
                    className={styles.socialIcon}
                    aria-hidden="true"
                  />
                </a>
                <a href="#" aria-label="Instagram">
                  <Image
                    src="/Instagram-Logo.wine.png"
                    alt=""
                    width={18}
                    height={18}
                    className={styles.socialIcon}
                    aria-hidden="true"
                  />
                </a>
                <a href="#" aria-label="LinkedIn">
                  <Image
                    src="/LinkedIn-Icon-Logo.wine.png"
                    alt=""
                    width={18}
                    height={18}
                    className={styles.socialIcon}
                    aria-hidden="true"
                  />
                </a>
                <a href="#" aria-label="TikTok">
                  <Image
                    src="/TikTok-Logo.wine.png"
                    alt=""
                    width={18}
                    height={18}
                    className={styles.socialIcon}
                    aria-hidden="true"
                  />
                </a>
              </div>
            </div>
            <div className={styles.footerSection}>
              <h4 className={styles.footerTitle}>Liens rapides</h4>
              <Link href="/">Accueil</Link>
              <Link href="#benefits">Avantages</Link>
              <Link href="#how-it-works">Comment ca marche</Link>
              <Link href="/privacy">Politique de confidentialite</Link>
            </div>
            <div className={styles.footerSection}>
              <h4 className={styles.footerTitle}>A propos</h4>
              <Link href="#security">Securite & confiance</Link>
              <Link href="/terms">Conditions d'utilisation</Link>
              <Link href="/sales-policy">Politique de vente</Link>
            </div>
            <div className={styles.footerSection}>
              <h4 className={styles.footerTitle}>Contact</h4>
              <p className={styles.footerText}>Email: contact@zwanga.com</p>
              <p className={styles.footerText}>Telephone: +243999403012</p>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <p>Copyright (c) {new Date().getFullYear()} ZWANGA. Tous droits reserves.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
