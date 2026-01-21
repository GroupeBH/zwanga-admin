"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Car, Users, MapPin, Shield, Clock, Star, Download, ArrowRight, Menu, X } from "lucide-react";
import styles from "./home.module.css";

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className={styles.page}>
      {/* Header */}
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
              style={{ background: 'transparent' }}
            />
            <span>ZWANGA</span>
          </Link>
          <nav className={`${styles.nav} ${mobileMenuOpen ? styles.navOpen : ""}`}>
            <Link href="#features" onClick={() => setMobileMenuOpen(false)}>Fonctionnalités</Link>
            <Link href="#app-preview" onClick={() => setMobileMenuOpen(false)}>Aperçu</Link>
            <Link href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>Comment ça marche</Link>
            <Link href="#about" onClick={() => setMobileMenuOpen(false)}>À propos</Link>
            <Link href="/login" className={styles.loginBtn} onClick={() => setMobileMenuOpen(false)}>Connexion</Link>
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

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.heroContent}>
            <div className={styles.heroText}>
              <h1 className={styles.heroTitle}>
                Réservez votre <span className={styles.accent}>trajet</span>
              </h1>
              <p className={styles.heroSubtitle}>
                Partagez les sièges vides de votre voiture et réduisez vos frais de déplacement.
                ZWANGA rend le covoiturage simple, sécurisé et économique.
              </p>
              <div className={styles.heroActions}>
                <Link href="/login" className={styles.primaryBtn}>
                  Commencer maintenant
                  <ArrowRight className={styles.btnIcon} />
                </Link>
                <div className={styles.appButtons}>
                  <button className={styles.appBtn}>
                    <Download className={styles.appBtnIcon} />
                    Google Play
                  </button>
                  <button className={styles.appBtn}>
                    <Download className={styles.appBtnIcon} />
                    App Store
                  </button>
                </div>
              </div>
            </div>
            <div className={styles.heroVisual}>
              <div className={styles.phoneMockup}>
                <div className={styles.phoneScreen}>
                  <Image
                    src="/Screenshot_20251226_215934.png"
                    alt="ZWANGA App - Écran d'accueil"
                    fill
                    className={styles.screenshot}
                    priority
                    sizes="(max-width: 768px) 240px, 300px"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={styles.stats}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Transformer des vies, un trajet à la fois</h2>
          <p className={styles.sectionSubtitle}>Jalons atteints</p>
          <div className={styles.statsGrid}>
            <div className={`${styles.statCard} ${styles.statCardBlue}`}>
              <Car className={styles.statIcon} />
              <div className={styles.statNumber}>29M</div>
              <div className={styles.statLabel}>Trajets</div>
            </div>
            <div className={`${styles.statCard} ${styles.statCardYellow}`}>
              <MapPin className={styles.statIcon} />
              <div className={styles.statNumber}>120</div>
              <div className={styles.statLabel}>Villes</div>
            </div>
            <div className={`${styles.statCard} ${styles.statCardOrange}`}>
              <Users className={styles.statIcon} />
              <div className={styles.statNumber}>8M</div>
              <div className={styles.statLabel}>Utilisateurs</div>
            </div>
            <div className={`${styles.statCard} ${styles.statCardBlue}`}>
              <Users className={styles.statIcon} />
              <div className={styles.statNumber}>100K</div>
              <div className={styles.statLabel}>Conducteurs</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={styles.features}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Pourquoi choisir ZWANGA ?</h2>
          <p className={styles.sectionSubtitle}>
            Une solution de covoiturage fiable pour vos déplacements locaux
          </p>
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Car />
              </div>
              <h3 className={styles.featureTitle}>Covoiturage facile</h3>
              <p className={styles.featureText}>
                Partagez vos trajets en quelques clics. Trouvez des passagers ou des conducteurs rapidement.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Shield />
              </div>
              <h3 className={styles.featureTitle}>Tarif estimé</h3>
              <p className={styles.featureText}>
                Connaissez le prix de votre trajet avant de réserver. Transparence totale sur les tarifs.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Users />
              </div>
              <h3 className={styles.featureTitle}>Expérience personnalisée</h3>
              <p className={styles.featureText}>
                Profitez d'une expérience adaptée à vos besoins et préférences de voyage.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Car />
              </div>
              <h3 className={styles.featureTitle}>Conducteurs professionnels</h3>
              <p className={styles.featureText}>
                Voyagez en toute sécurité avec des conducteurs vérifiés et expérimentés.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Shield />
              </div>
              <h3 className={styles.featureTitle}>Support d'urgence</h3>
              <p className={styles.featureText}>
                Assistance disponible 24/7 pour votre sécurité et votre tranquillité d'esprit.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Clock />
              </div>
              <h3 className={styles.featureTitle}>Réservation à l'avance</h3>
              <p className={styles.featureText}>
                Planifiez vos trajets à l'avance et voyagez en toute sérénité.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* App Preview Section */}
      <section id="app-preview" className={styles.appPreview}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Découvrez l'application ZWANGA</h2>
          <p className={styles.sectionSubtitle}>
            Une interface intuitive et moderne pour faciliter vos déplacements
          </p>
          <div className={styles.screenshotsGrid}>
            <div className={styles.screenshotCard}>
              <div className={styles.screenshotWrapper}>
                <Image
                  src="/Screenshot_20251226_215934.png"
                  alt="ZWANGA App - Écran d'accueil"
                  width={300}
                  height={600}
                  className={styles.screenshotImage}
                />
              </div>
            </div>
            <div className={styles.screenshotCard}>
              <div className={styles.screenshotWrapper}>
                <Image
                  src="/Screenshot_20251226_215948.png"
                  alt="ZWANGA App - Recherche de trajet"
                  width={300}
                  height={600}
                  className={styles.screenshotImage}
                />
              </div>
            </div>
            <div className={styles.screenshotCard}>
              <div className={styles.screenshotWrapper}>
                <Image
                  src="/Screenshot_20251226_220031.png"
                  alt="ZWANGA App - Réservation"
                  width={300}
                  height={600}
                  className={styles.screenshotImage}
                />
              </div>
            </div>
            <div className={styles.screenshotCard}>
              <div className={styles.screenshotWrapper}>
                <Image
                  src="/Screenshot_20251226_220124.png"
                  alt="ZWANGA App - Profil"
                  width={300}
                  height={600}
                  className={styles.screenshotImage}
                />
              </div>
            </div>
            <div className={styles.screenshotCard}>
              <div className={styles.screenshotWrapper}>
                <Image
                  src="/Screenshot_20251226_220143.png"
                  alt="ZWANGA App - Historique"
                  width={300}
                  height={600}
                  className={styles.screenshotImage}
                />
              </div>
            </div>
            <div className={styles.screenshotCard}>
              <div className={styles.screenshotWrapper}>
                <Image
                  src="/Screenshot_20251226_220205.png"
                  alt="ZWANGA App - Paramètres"
                  width={300}
                  height={600}
                  className={styles.screenshotImage}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className={styles.howItWorks}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Comment fonctionne ZWANGA</h2>
          <p className={styles.sectionSubtitle}>Simple. Sécurisé. Partage.</p>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepImage}>
                <Image
                  src="/Screenshot_20251226_215948.png"
                  alt="Réservez un trajet"
                  width={200}
                  height={400}
                  className={styles.stepScreenshot}
                />
              </div>
              <h3 className={styles.stepTitle}>Réservez un trajet</h3>
              <p className={styles.stepText}>
                Choisissez votre point de départ et votre destination, ainsi que le type de trajet qui correspond à vos besoins.
              </p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepImage}>
                <Image
                  src="/Screenshot_20251226_220031.png"
                  alt="Correspondance avec un conducteur"
                  width={200}
                  height={400}
                  className={styles.stepScreenshot}
                />
              </div>
              <h3 className={styles.stepTitle}>Correspondance avec un conducteur</h3>
              <p className={styles.stepText}>
                ZWANGA vous mettra en relation avec le conducteur disponible le plus proche.
              </p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <div className={styles.stepImage}>
                <Image
                  src="/Screenshot_20251226_220143.png"
                  alt="Profitez de votre trajet"
                  width={200}
                  height={400}
                  className={styles.stepScreenshot}
                />
              </div>
              <h3 className={styles.stepTitle}>Profitez de votre trajet</h3>
              <p className={styles.stepText}>
                Retrouvez votre conducteur grâce à nos services GPS en temps réel et profitez de votre trajet !
              </p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>4</div>
              <div className={styles.stepImage}>
                <Image
                  src="/Screenshot_20251226_220124.png"
                  alt="Payez et évaluez"
                  width={200}
                  height={400}
                  className={styles.stepScreenshot}
                />
              </div>
              <h3 className={styles.stepTitle}>Payez et évaluez</h3>
              <p className={styles.stepText}>
                Payez en espèces ou par carte et évaluez votre conducteur pour aider la communauté.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section className={styles.download}>
        <div className={styles.container}>
          <div className={styles.downloadContent}>
            <div className={styles.downloadText}>
              <h2 className={styles.downloadTitle}>Téléchargez l'application ZWANGA</h2>
              <p className={styles.downloadSubtitle}>
                ZWANGA est une solution innovante de covoiturage qui facilite vos déplacements locaux.
                Que vous ayez besoin d'aller quelque part rapidement ou que vous souhaitiez gagner de l'argent
                en partageant votre véhicule, ZWANGA offre une solution de classe mondiale.
              </p>
              <Link href="/login" className={styles.primaryBtn}>
                Commencer
                <ArrowRight className={styles.btnIcon} />
              </Link>
            </div>
            <div className={styles.downloadVisual}>
              <div className={styles.phoneMockup}>
                <div className={styles.phoneScreen}>
                  <Image
                    src="/Screenshot_20251226_215934.png"
                    alt="ZWANGA App"
                    fill
                    className={styles.screenshot}
                    sizes="(max-width: 768px) 240px, 300px"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
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
                  style={{ background: 'transparent' }}
                />
                <span>ZWANGA</span>
              </Link>
              <p className={styles.footerText}>
                ZWANGA est une solution innovante de covoiturage qui facilite vos déplacements locaux.
              </p>
              <div className={styles.socialLinks}>
                <a href="#" aria-label="Facebook">FB</a>
                <a href="#" aria-label="Twitter">TW</a>
                <a href="#" aria-label="Instagram">IG</a>
                <a href="#" aria-label="LinkedIn">LI</a>
              </div>
            </div>
            <div className={styles.footerSection}>
              <h4 className={styles.footerTitle}>Liens rapides</h4>
              <Link href="/">Accueil</Link>
              <Link href="#features">Fonctionnalités</Link>
              <Link href="#how-it-works">Comment ça marche</Link>
              <Link href="/privacy">Politique de confidentialité</Link>
            </div>
            <div className={styles.footerSection}>
              <h4 className={styles.footerTitle}>À propos</h4>
              <Link href="#about">Notre histoire</Link>
              <Link href="/terms">Conditions d'utilisation</Link>
              <Link href="/sales-policy">Politique de vente</Link>
            </div>
            <div className={styles.footerSection}>
              <h4 className={styles.footerTitle}>Contact</h4>
              <p className={styles.footerText}>Email: contact@zwanga.com</p>
              <p className={styles.footerText}>Téléphone: +243999403012</p>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <p>Copyright © {new Date().getFullYear()} ZWANGA. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
