"use client";

import styles from "../styles/legal.module.css";

export default function PrivacyPolicyPage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Politique de Confidentialité</h1>
          <p className={styles.lastUpdated}>
            Dernière mise à jour : {new Date().toLocaleDateString("fr-CD", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </header>

        <main className={styles.content}>
          <section className={styles.section}>
            <h2>1. Introduction</h2>
            <p>
              ZWANGA ("nous", "notre", "nos") s'engage à protéger votre vie privée.
              Cette politique de confidentialité explique comment nous collectons,
              utilisons, stockons et protégeons vos informations personnelles lorsque
              vous utilisez notre plateforme de covoiturage.
            </p>
          </section>

          <section className={styles.section}>
            <h2>2. Informations que nous collectons</h2>
            <h3>2.1. Informations fournies par vous</h3>
            <ul>
              <li>
                <strong>Informations d'identification :</strong> Nom, prénom, numéro
                de téléphone, adresse e-mail
              </li>
              <li>
                <strong>Informations de profil :</strong> Photo de profil, préférences
                de voyage
              </li>
              <li>
                <strong>Documents d'identité :</strong> CNI (recto/verso), selfie pour
                vérification KYC
              </li>
              <li>
                <strong>Informations de paiement :</strong> Méthodes de paiement,
                historique des transactions
              </li>
              <li>
                <strong>Informations de véhicule :</strong> Marque, modèle, plaque
                d'immatriculation, photo du véhicule
              </li>
            </ul>

            <h3>2.2. Informations collectées automatiquement</h3>
            <ul>
              <li>
                <strong>Données de localisation :</strong> Coordonnées GPS pour les
                trajets
              </li>
              <li>
                <strong>Données d'utilisation :</strong> Historique des trajets,
                réservations, évaluations
              </li>
              <li>
                <strong>Données techniques :</strong> Adresse IP, type d'appareil,
                système d'exploitation, identifiants uniques
              </li>
              <li>
                <strong>Cookies et technologies similaires :</strong> Pour améliorer
                votre expérience et analyser l'utilisation de la plateforme
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>3. Utilisation de vos informations</h2>
            <p>Nous utilisons vos informations pour :</p>
            <ul>
              <li>
                Fournir et améliorer nos services de covoiturage
              </li>
              <li>
                Vérifier votre identité et valider vos documents KYC
              </li>
              <li>
                Faciliter les transactions et les paiements
              </li>
              <li>
                Communiquer avec vous concernant vos trajets et réservations
              </li>
              <li>
                Assurer la sécurité et prévenir la fraude
              </li>
              <li>
                Vous envoyer des notifications importantes et des mises à jour
              </li>
              <li>
                Analyser l'utilisation de la plateforme pour améliorer nos services
              </li>
              <li>
                Respecter nos obligations légales et réglementaires
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>4. Partage de vos informations</h2>
            <p>
              Nous ne vendons jamais vos informations personnelles. Nous pouvons
              partager vos informations uniquement dans les cas suivants :
            </p>
            <ul>
              <li>
                <strong>Avec d'autres utilisateurs :</strong> Nom, photo de profil,
                évaluations (pour les trajets et réservations)
              </li>
              <li>
                <strong>Prestataires de services :</strong> Services de paiement,
                hébergement cloud (AWS S3), services d'analyse
              </li>
              <li>
                <strong>Obligations légales :</strong> Si requis par la loi ou pour
                répondre à une demande gouvernementale légitime
              </li>
              <li>
                <strong>Protection de nos droits :</strong> Pour protéger nos droits,
                votre sécurité ou celle d'autrui
              </li>
              <li>
                <strong>Avec votre consentement :</strong> Dans tout autre cas avec
                votre autorisation explicite
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>5. Sécurité de vos données</h2>
            <p>
              Nous mettons en œuvre des mesures de sécurité techniques et
              organisationnelles appropriées pour protéger vos informations :
            </p>
            <ul>
              <li>
                Chiffrement des données sensibles (SSL/TLS)
              </li>
              <li>
                Stockage sécurisé des documents sur AWS S3 avec accès restreint
              </li>
              <li>
                Authentification à deux facteurs pour les comptes administrateurs
              </li>
              <li>
                Accès limité aux données personnelles aux seuls employés autorisés
              </li>
              <li>
                Surveillance continue des systèmes pour détecter les violations
              </li>
            </ul>
            <p>
              Cependant, aucune méthode de transmission sur Internet n'est 100%
              sécurisée. Bien que nous nous efforcions de protéger vos données, nous
              ne pouvons garantir une sécurité absolue.
            </p>
          </section>

          <section className={styles.section}>
            <h2>6. Conservation des données</h2>
            <p>
              Nous conservons vos informations personnelles aussi longtemps que
              nécessaire pour :
            </p>
            <ul>
              <li>
                Fournir nos services et répondre à vos demandes
              </li>
              <li>
                Respecter nos obligations légales et réglementaires
              </li>
              <li>
                Résoudre les litiges et faire respecter nos accords
              </li>
            </ul>
            <p>
              Les données peuvent être conservées après la fermeture de votre compte
              si nécessaire pour des raisons légales ou de sécurité.
            </p>
          </section>

          <section className={styles.section}>
            <h2>7. Vos droits</h2>
            <p>Conformément à la réglementation en vigueur, vous avez le droit de :</p>
            <ul>
              <li>
                <strong>Accès :</strong> Demander une copie de vos données personnelles
              </li>
              <li>
                <strong>Rectification :</strong> Corriger vos informations inexactes
              </li>
              <li>
                <strong>Suppression :</strong> Demander la suppression de vos données
                (sous réserve des obligations légales)
              </li>
              <li>
                <strong>Opposition :</strong> Vous opposer au traitement de vos données
                dans certains cas
              </li>
              <li>
                <strong>Portabilité :</strong> Recevoir vos données dans un format
                structuré
              </li>
              <li>
                <strong>Retrait du consentement :</strong> Retirer votre consentement
                à tout moment
              </li>
            </ul>
            <p>
              Pour exercer ces droits, contactez-nous à l'adresse :
              <strong> privacy@zwanga.com</strong>
            </p>
          </section>

          <section className={styles.section}>
            <h2>8. Cookies</h2>
            <p>
              <strong>Important :</strong> Les cookies sont uniquement utilisés dans le
              backoffice administrateur (interface web d'administration). L'application
              mobile ZWANGA n'utilise pas de cookies.
            </p>
            <h3>8.1. Utilisation des cookies dans le backoffice admin</h3>
            <p>
              Dans le backoffice administrateur, nous utilisons des cookies pour :
            </p>
            <ul>
              <li>
                <strong>Authentification :</strong> Stockage sécurisé des tokens JWT
                (accessToken et refreshToken) pour maintenir votre session de connexion
              </li>
              <li>
                <strong>Sécurité :</strong> Protection contre les attaques CSRF et
                maintien de la sécurité de votre session
              </li>
              <li>
                <strong>Préférences :</strong> Mémorisation de vos préférences
                d'interface (thème sombre/clair, préférences de langue)
              </li>
            </ul>
            <p>
              Ces cookies sont des cookies HTTP-only sécurisés, ce qui signifie qu'ils
              ne peuvent pas être accédés par du code JavaScript malveillant et sont
              transmis uniquement via des connexions HTTPS sécurisées.
            </p>
            <h3>8.2. Gestion des cookies</h3>
            <p>
              Vous pouvez gérer vos préférences de cookies dans les paramètres de votre
              navigateur web. Cependant, la désactivation des cookies essentiels peut
              empêcher le bon fonctionnement du backoffice administrateur.
            </p>
            <p>
              <strong>Note :</strong> L'application mobile utilise des tokens d'authentification
              stockés localement sur l'appareil (via le stockage sécurisé du système
              d'exploitation), et non des cookies.
            </p>
          </section>

          <section className={styles.section}>
            <h2>9. Modifications de cette politique</h2>
            <p>
              Nous pouvons modifier cette politique de confidentialité de temps à autre.
              Nous vous informerons de tout changement significatif par e-mail ou via
              une notification sur la plateforme. La date de "Dernière mise à jour"
              en haut de cette page indique quand la politique a été révisée pour la
              dernière fois.
            </p>
          </section>

          <section className={styles.section}>
            <h2>10. Contact</h2>
            <p>
              Pour toute question concernant cette politique de confidentialité ou
              pour exercer vos droits, contactez-nous :
            </p>
            <div className={styles.contactInfo}>
              <p>
                <strong>ZWANGA</strong>
                <br />
                Email : <a href="mailto:privacy@zwanga.com">privacy@zwanga.com</a>
                <br />
                Support : <a href="mailto:support@zwanga.com">support@zwanga.com</a>
                <br />
                Téléphone : +243999403012
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

