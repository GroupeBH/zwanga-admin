"use client";

import styles from "../styles/legal.module.css";

export default function TermsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Termes et Conditions d'Utilisation</h1>
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
            <h2>1. Acceptation des conditions</h2>
            <p>
              En accédant et en utilisant la plateforme ZWANGA ("la Plateforme", "le
              Service"), vous acceptez d'être lié par ces Termes et Conditions
              d'Utilisation ("les Conditions"). Si vous n'acceptez pas ces conditions,
              veuillez ne pas utiliser notre service.
            </p>
            <p>
              Ces conditions s'appliquent à tous les utilisateurs de la plateforme,
              y compris les conducteurs, les passagers et les administrateurs.
            </p>
          </section>

          <section className={styles.section}>
            <h2>2. Description du service</h2>
            <p>
              ZWANGA est une plateforme de covoiturage qui met en relation des
              conducteurs et des passagers pour partager des trajets. Nous facilitons
              les transactions mais ne sommes pas partie prenante aux accords entre
              conducteurs et passagers.
            </p>
            <p>
              <strong>Important :</strong> ZWANGA n'est pas un service de transport
              public. Les conducteurs sont des particuliers qui proposent des places
              dans leur véhicule personnel.
            </p>
          </section>

          <section className={styles.section}>
            <h2>3. Inscription et compte utilisateur</h2>
            <h3>3.1. Éligibilité</h3>
            <ul>
              <li>
                Vous devez avoir au moins 18 ans pour utiliser la plateforme
              </li>
              <li>
                Vous devez posséder un permis de conduire valide pour proposer des
                trajets en tant que conducteur
              </li>
              <li>
                Vous devez fournir des informations exactes et à jour
              </li>
              <li>
                Vous êtes responsable de la sécurité de votre compte et de votre mot
                de passe
              </li>
            </ul>

            <h3>3.2. Vérification KYC</h3>
            <p>
              Pour utiliser certains services, notamment proposer des trajets, vous
              devez compléter la vérification KYC (Know Your Customer) en fournissant :
            </p>
            <ul>
              <li>Une copie recto/verso de votre carte d'identité nationale (CNI)</li>
              <li>Un selfie de vérification</li>
            </ul>
            <p>
              ZWANGA se réserve le droit d'approuver ou de rejeter votre demande de
              vérification à sa seule discrétion.
            </p>
          </section>

          <section className={styles.section}>
            <h2>4. Utilisation de la plateforme</h2>
            <h3>4.1. Conduite responsable</h3>
            <p>En tant que conducteur, vous vous engagez à :</p>
            <ul>
              <li>
                Posséder un permis de conduire valide et une assurance véhicule
                appropriée
              </li>
              <li>
                Maintenir votre véhicule en bon état de fonctionnement et conforme aux
                normes de sécurité
              </li>
              <li>
                Respecter le code de la route et toutes les lois applicables
              </li>
              <li>
                Ne pas conduire sous l'influence de l'alcool ou de drogues
              </li>
              <li>
                Respecter les limites de vitesse et les règles de sécurité routière
              </li>
            </ul>

            <h3>4.2. Comportement des passagers</h3>
            <p>En tant que passager, vous vous engagez à :</p>
            <ul>
              <li>
                Respecter le conducteur et les autres passagers
              </li>
              <li>
                Être ponctuel aux points de rendez-vous convenus
              </li>
              <li>
                Respecter le véhicule du conducteur
              </li>
              <li>
                Ne pas fumer dans le véhicule sans autorisation
              </li>
              <li>
                Informer le conducteur de tout problème ou préoccupation
              </li>
            </ul>

            <h3>4.3. Interdictions</h3>
            <p>Il est strictement interdit de :</p>
            <ul>
              <li>
                Utiliser la plateforme à des fins illégales ou frauduleuses
              </li>
              <li>
                Harceler, menacer ou nuire à d'autres utilisateurs
              </li>
              <li>
                Publier de fausses informations ou créer de faux comptes
              </li>
              <li>
                Utiliser la plateforme pour transporter des marchandises illégales
              </li>
              <li>
                Contourner les frais de la plateforme ou effectuer des transactions
                hors plateforme
              </li>
              <li>
                Utiliser des robots, scripts ou autres moyens automatisés pour accéder
                à la plateforme
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>5. Réservations et annulations</h2>
            <h3>5.1. Réservations</h3>
            <ul>
              <li>
                Les réservations sont soumises à l'approbation du conducteur
              </li>
              <li>
                Le conducteur peut accepter ou rejeter une réservation à sa
                discrétion
              </li>
              <li>
                Une fois acceptée, la réservation est confirmée et le paiement peut
                être traité
              </li>
            </ul>

            <h3>5.2. Annulations</h3>
            <ul>
              <li>
                <strong>Par le passager :</strong> Les annulations peuvent être
                soumises jusqu'à 2 heures avant le départ. Des frais d'annulation
                peuvent s'appliquer selon les conditions du trajet.
              </li>
              <li>
                <strong>Par le conducteur :</strong> Les annulations doivent être
                effectuées au moins 4 heures avant le départ. Des sanctions peuvent
                être appliquées en cas d'annulation répétée.
              </li>
              <li>
                <strong>Annulation automatique :</strong> Si le conducteur n'approuve
                pas une réservation dans les 24 heures, elle est automatiquement
                annulée.
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>6. Paiements et frais</h2>
            <h3>6.1. Prix des trajets</h3>
            <ul>
              <li>
                Les prix sont fixés par le conducteur et indiqués par place
              </li>
              <li>
                Les prix incluent les frais de la plateforme
              </li>
              <li>
                ZWANGA se réserve le droit de modifier les prix en cas d'erreur
                manifeste
              </li>
            </ul>

            <h3>6.2. Frais de service</h3>
            <p>
              ZWANGA prélève des frais de service sur chaque transaction pour couvrir
              les coûts d'exploitation de la plateforme. Ces frais sont clairement
              indiqués avant la confirmation de la réservation.
            </p>

            <h3>6.3. Remboursements</h3>
            <ul>
              <li>
                Les remboursements sont traités selon notre politique de
                remboursement
              </li>
              <li>
                En cas d'annulation par le conducteur, le passager est intégralement
                remboursé
              </li>
              <li>
                En cas d'annulation par le passager, les conditions de remboursement
                dépendent du délai d'annulation
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>7. Responsabilité et garanties</h2>
            <h3>7.1. Limitation de responsabilité</h3>
            <p>
              ZWANGA agit uniquement en tant qu'intermédiaire entre conducteurs et
              passagers. Nous ne sommes pas responsables :
            </p>
            <ul>
              <li>
                Des accidents, blessures ou dommages survenus pendant un trajet
              </li>
              <li>
                Du comportement des conducteurs ou des passagers
              </li>
              <li>
                De la qualité, sécurité ou conformité des véhicules
              </li>
              <li>
                Des retards ou annulations de trajets
              </li>
              <li>
                Des pertes ou dommages aux biens personnels
              </li>
            </ul>

            <h3>7.2. Assurance</h3>
            <p>
              Les conducteurs sont responsables de maintenir une assurance véhicule
              appropriée couvrant l'utilisation de leur véhicule à des fins de
              covoiturage. ZWANGA recommande fortement une assurance complémentaire
              pour les activités de covoiturage.
            </p>

            <h3>7.3. Garanties</h3>
            <p>
              La plateforme est fournie "en l'état" sans garantie d'aucune sorte,
              expresse ou implicite. Nous ne garantissons pas que le service sera
              ininterrompu, sécurisé ou exempt d'erreurs.
            </p>
          </section>

          <section className={styles.section}>
            <h2>8. Propriété intellectuelle</h2>
            <p>
              Tous les contenus de la plateforme ZWANGA, y compris mais sans s'y
              limiter, les textes, graphiques, logos, icônes, images, clips audio,
              téléchargements numériques et compilations de données, sont la propriété
              de ZWANGA ou de ses fournisseurs de contenu et sont protégés par les lois
              sur le droit d'auteur.
            </p>
            <p>
              Vous n'êtes pas autorisé à reproduire, distribuer, modifier, créer des
              œuvres dérivées, afficher publiquement, publier, télécharger, stocker ou
              transmettre tout contenu de la plateforme sans autorisation écrite
              préalable.
            </p>
          </section>

          <section className={styles.section}>
            <h2>9. Suspension et résiliation</h2>
            <p>
              ZWANGA se réserve le droit de suspendre ou de résilier votre compte à
              tout moment, avec ou sans préavis, pour :
            </p>
            <ul>
              <li>
                Violation de ces Conditions d'utilisation
              </li>
              <li>
                Comportement frauduleux ou suspect
              </li>
              <li>
                Non-respect des règles de la communauté
              </li>
              <li>
                Plaintes répétées d'autres utilisateurs
              </li>
              <li>
                Activités illégales
              </li>
            </ul>
            <p>
              En cas de résiliation, vous perdrez l'accès à votre compte et à toutes
              les données associées, sous réserve des obligations légales de
              conservation.
            </p>
          </section>

          <section className={styles.section}>
            <h2>10. Modifications des conditions</h2>
            <p>
              Nous nous réservons le droit de modifier ces Conditions à tout moment.
              Les modifications entrent en vigueur dès leur publication sur la
              plateforme. Votre utilisation continue du service après la publication
              des modifications constitue votre acceptation des nouvelles conditions.
            </p>
            <p>
              Nous vous encourageons à consulter régulièrement cette page pour rester
              informé des conditions en vigueur.
            </p>
          </section>

          <section className={styles.section}>
            <h2>11. Droit applicable et juridiction</h2>
            <p>
              Ces Conditions sont régies par les lois de la République Démocratique du
              Congo. Tout litige découlant de ou lié à ces Conditions sera soumis à la
              juridiction exclusive des tribunaux compétents de Kinshasa.
            </p>
          </section>

          <section className={styles.section}>
            <h2>12. Contact</h2>
            <p>
              Pour toute question concernant ces Conditions d'utilisation, contactez-nous :
            </p>
            <div className={styles.contactInfo}>
              <p>
                <strong>ZWANGA</strong>
                <br />
                Email : <a href="mailto:legal@zwanga.com">legal@zwanga.com</a>
                <br />
                Support : <a href="mailto:support@zwanga.com">support@zwanga.com</a>
                <br />
                Téléphone : +243 XXX XXX XXX
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

