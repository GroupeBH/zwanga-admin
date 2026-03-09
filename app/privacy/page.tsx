"use client";

import styles from "../styles/legal.module.css";

export default function PrivacyPolicyPage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Politique de Confidentialité – Zwanga</h1>
          <p className={styles.lastUpdated}>
            Date d’entrée en vigueur : 9 mars 2026<br />
            Dernière mise à jour : 9 mars 2026
          </p>
        </header>

        <main className={styles.content}>
          <section className={styles.section}>
            <h2>1) Portée</h2>
            <p>Cette politique s’applique à l’application mobile Zwanga, à ses fonctionnalités (trajets, navigation, sécurité, messagerie, vérification d’identité), et aux services associés.</p>
          </section>

          <section className={styles.section}>
            <h2>2) Données que nous collectons</h2>
            <p>Nous collectons uniquement les données nécessaires au fonctionnement du service.</p>
            
            <h3>2.1 Données de compte et profil</h3>
            <ul>
              <li>Nom, prénom</li>
              <li>Numéro de téléphone</li>
              <li>Adresse e-mail (si fournie)</li>
              <li>Photo de profil</li>
              <li>Rôle (conducteur/passager)</li>
              <li>Informations véhicule (marque, modèle, couleur, plaque)</li>
              <li>Notes, avis et historique de trajets</li>
            </ul>
            
            <h3>2.2 Données de localisation</h3>
            <ul>
              <li>Position approximative et précise (<code>ACCESS_COARSE_LOCATION</code>, <code>ACCESS_FINE_LOCATION</code>)</li>
              <li>Position en arrière-plan (<code>ACCESS_BACKGROUND_LOCATION</code>) <strong>uniquement pendant un trajet actif / navigation / sécurité</strong></li>
              <li>Itinéraires, points de départ/arrivée, progression du trajet</li>
            </ul>
            
            <p>La localisation sert à :</p>
            <ul>
              <li>afficher les trajets à proximité,</li>
              <li>naviguer pendant les courses,</li>
              <li>partager la progression du trajet avec les participants concernés,</li>
              <li>activer les fonctions de sécurité (ex: alertes, suivi de trajet).</li>
            </ul>
            
            <p>Nous n’utilisons pas la localisation pour la publicité ciblée.</p>
            
            <h3>2.3 Données de sécurité</h3>
            <ul>
              <li>Contacts d’urgence ajoutés par l’utilisateur (nom, téléphone, relation)</li>
              <li>Alertes de sécurité (type d’alerte, horodatage, position associée, niveau batterie éventuel)</li>
              <li>Signalements d’utilisateurs (motif, description, contexte trajet/réservation)</li>
            </ul>
            
            <h3>2.4 Données d’identité (KYC)</h3>
            <p>Si vous soumettez une vérification d’identité :</p>
            <ul>
              <li>Photos des documents (ex: recto/verso pièce d’identité)</li>
              <li>Selfie de vérification</li>
              <li>Statut de vérification (en attente, approuvé, rejeté)</li>
            </ul>
            
            <h3>2.5 Données de communication</h3>
            <ul>
              <li>Messages entre utilisateurs</li>
              <li>Métadonnées associées (horodatage, identifiants techniques)</li>
            </ul>
            
            <h3>2.6 Données de contacts téléphone (optionnel)</h3>
            <p>Si vous utilisez la fonctionnalité d’import de contact d’urgence, nous accédons à votre carnet d’adresses uniquement après votre autorisation, pour sélectionner un contact.</p>
            
            <h3>2.7 Données techniques</h3>
            <ul>
              <li>Jetons d’authentification (stockés localement de manière sécurisée)</li>
              <li>Jetons de notification push (FCM/Expo)</li>
              <li>Données minimales de diagnostic et logs nécessaires à la sécurité, à la prévention de fraude et à la stabilité du service</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>3) Finalités d’utilisation</h2>
            <p>Nous utilisons vos données pour :</p>
            <ul>
              <li>créer et gérer votre compte,</li>
              <li>fournir les fonctionnalités de covoiturage et navigation,</li>
              <li>exécuter et sécuriser les trajets,</li>
              <li>permettre la communication entre participants,</li>
              <li>vérifier l’identité des conducteurs/utilisateurs concernés,</li>
              <li>envoyer des notifications de service et de sécurité,</li>
              <li>prévenir les abus, fraudes et incidents,</li>
              <li>respecter les obligations légales et réglementaires.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>4) Bases légales (selon juridiction applicable)</h2>
            <p>Selon votre pays, nous traitons les données sur les bases suivantes :</p>
            <ul>
              <li>exécution du contrat (fournir le service Zwanga),</li>
              <li>consentement (ex: permissions appareil, contacts, localisation),</li>
              <li>intérêt légitime (sécurité, prévention de fraude, amélioration du service),</li>
              <li>obligation légale (conformité, conservation imposée par la loi).</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>5) Partage des données</h2>
            <p>Nous pouvons partager certaines données avec :</p>
            
            <ul>
              <li><strong>Autres utilisateurs de Zwanga</strong> :
                informations nécessaires au trajet (ex: profil, points de rendez-vous, progression du trajet, contact lorsque requis par la fonctionnalité).</li>
              <li><strong>Prestataires techniques</strong> :
                hébergement, API cartographiques/géocodage/navigation, notifications push, authentification.</li>
              <li><strong>Autorités compétentes</strong> :
                lorsque la loi l'exige ou pour protéger des droits et la sécurité des personnes.</li>
            </ul>
            
            <p>Nous ne vendons pas vos données personnelles.</p>
          </section>

          <section className={styles.section}>
            <h2>6) Conservation des données</h2>
            <p>Nous conservons les données uniquement pendant la durée nécessaire aux finalités décrites ci-dessus :</p>
            
            <ul>
              <li>Données de compte : pendant la durée d’activation du compte, puis suppression ou anonymisation dans un délai raisonnable après demande, sauf obligation légale.</li>
              <li>Données de trajets, sécurité et signalements : conservées pour la gestion du service, la sécurité, la résolution des litiges et la prévention de fraude, puis supprimées/anonymisées.</li>
              <li>Documents KYC : conservés tant que nécessaire à la vérification et à la conformité légale.</li>
              <li>Logs techniques : conservation limitée, proportionnée aux besoins de sécurité/maintenance.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>7) Sécurité des données</h2>
            <p>Nous mettons en place des mesures techniques et organisationnelles raisonnables pour protéger vos données :</p>
            <ul>
              <li>contrôle d’accès,</li>
              <li>chiffrement des flux quand applicable,</li>
              <li>stockage sécurisé des jetons sensibles sur l'appareil,</li>
              <li>journalisation de sécurité et mécanismes anti-abus.</li>
            </ul>
            
            <p>Aucun système n’étant totalement infaillible, nous améliorons en continu nos mesures de protection.</p>
          </section>

          <section className={styles.section}>
            <h2>8) Vos droits</h2>
            <p>Selon la loi applicable, vous pouvez demander :</p>
            <ul>
              <li>l’accès à vos données,</li>
              <li>la rectification de données inexactes,</li>
              <li>la suppression de votre compte et de vos données (sous réserve des obligations légales),</li>
              <li>la limitation ou l’opposition à certains traitements,</li>
              <li>la portabilité lorsque applicable.</li>
            </ul>
            
            <p>Vous pouvez aussi gérer les permissions (localisation, contacts, notifications, caméra, galerie) dans les paramètres de votre appareil.</p>
          </section>

          <section className={styles.section}>
            <h2>9) Suppression de compte</h2>
            <p>Vous pouvez demander la suppression de votre compte via le support Zwanga.<br />
            La suppression du compte entraîne la suppression ou l’anonymisation des données associées, sauf données devant être conservées pour des obligations légales, sécurité, prévention de fraude ou résolution de litiges.</p>
          </section>

          <section className={styles.section}>
            <h2>10) Mineurs</h2>
            <p>Zwanga n’est pas destiné aux enfants selon l’âge minimal requis par la législation locale.<br />
            Si nous apprenons qu’un mineur utilise le service en violation de ces règles, nous prendrons les mesures nécessaires.</p>
          </section>

          <section className={styles.section}>
            <h2>11) Transferts internationaux</h2>
            <p>Vos données peuvent être traitées dans des pays autres que votre pays de résidence, avec des garanties appropriées lorsque requis par la loi.</p>
          </section>

          <section className={styles.section}>
            <h2>12) Modifications de cette politique</h2>
            <p>Nous pouvons mettre à jour cette politique pour refléter l’évolution du service ou des obligations légales.<br />
            La version à jour est publiée avec sa date de mise à jour.</p>
          </section>

          <section className={styles.section}>
            <h2>13) Contact</h2>
            <p>Pour toute question liée à la vie privée, utilisez le support Zwanga disponible dans l’application ou via le site officiel de Zwanga.</p>
          </section>
          
          <header className={styles.header}>
            <h1>Privacy Policy – Zwanga</h1>
            <p className={styles.lastUpdated}>
              Effective date: March 9, 2026<br />
              Last updated: March 9, 2026
            </p>
          </header>
          
          <section className={styles.section}>
            <h2>1) Scope</h2>
            <p>This policy applies to the Zwanga mobile app and related services (ride matching, navigation, safety, messaging, and identity verification).</p>
          </section>

          <section className={styles.section}>
            <h2>2) Data we collect</h2>
            <ul>
              <li>Account/profile data: name, phone number, email (if provided), profile photo, role, vehicle details, ratings/reviews.</li>
              <li>Location data: approximate and precise location, including background location only during active trip/navigation/safety flows.</li>
              <li>Safety data: emergency contacts, safety alerts, user reports.</li>
              <li>Identity verification data (KYC): ID document images, selfie, verification status.</li>
              <li>Communications: in-app messages and related metadata.</li>
              <li>Contacts data (optional): only if user imports an emergency contact with permission.</li>
              <li>Technical data: auth tokens (securely stored), push tokens, minimal diagnostics/security logs.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>3) Why we use data</h2>
            <ul>
              <li>Provide core ride-sharing and navigation features.</li>
              <li>Enable safety features and trip monitoring.</li>
              <li>Support communication between participants.</li>
              <li>Verify identity where required.</li>
              <li>Send service and safety notifications.</li>
              <li>Prevent abuse/fraud and comply with legal obligations.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>4) Data sharing</h2>
            <p>We may share data with:</p>
            <ul>
              <li>Other Zwanga users when needed for trip execution/safety.</li>
              <li>Service providers (hosting, maps/geocoding, push notifications, authentication).</li>
              <li>Authorities when legally required.</li>
            </ul>
            
            <p>We do not sell personal data.</p>
          </section>

          <section className={styles.section}>
            <h2>5) Data retention</h2>
            <p>We keep data only as long as necessary for service delivery, safety, legal compliance, fraud prevention, and dispute handling, then delete or anonymize it within a reasonable timeframe.</p>
          </section>

          <section className={styles.section}>
            <h2>6) Security</h2>
            <p>We use reasonable technical and organizational safeguards (access controls, secure storage of sensitive tokens, and security monitoring).</p>
          </section>

          <section className={styles.section}>
            <h2>7) Your rights</h2>
            <p>Depending on applicable law, you may request access, correction, deletion, restriction, objection, and portability.<br />
            You can also revoke app permissions (location, contacts, camera, photos, notifications) in device settings.</p>
          </section>

          <section className={styles.section}>
            <h2>8) Account deletion</h2>
            <p>Users can request account deletion through Zwanga support. Associated data is deleted or anonymized, except where retention is required by law, security, anti-fraud, or dispute resolution obligations.</p>
          </section>

          <section className={styles.section}>
            <h2>9) Children</h2>
            <p>Zwanga is not intended for children below the minimum legal age.</p>
          </section>

          <section className={styles.section}>
            <h2>10) International transfers</h2>
            <p>Data may be processed outside your country with appropriate safeguards where legally required.</p>
          </section>

          <section className={styles.section}>
            <h2>11) Policy updates</h2>
            <p>We may update this policy and publish the revised version with a new update date.</p>
          </section>

          <section className={styles.section}>
            <h2>12) Contact</h2>
            <p>For privacy requests, use Zwanga support in-app or via Zwanga's official website.</p>
          </section>
        </main>
      </div>
    </div>
  );
}