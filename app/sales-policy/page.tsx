"use client";

import styles from "../styles/legal.module.css";

export default function SalesPolicyPage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Politique de Ventes et Services</h1>
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
              Cette politique de ventes et services définit les conditions générales
              de vente et les modalités d'utilisation des services proposés par ZWANGA.
              Elle s'applique à tous les utilisateurs de la plateforme, qu'ils soient
              conducteurs ou passagers.
            </p>
          </section>

          <section className={styles.section}>
            <h2>2. Description des services</h2>
            <h3>2.1. Service de mise en relation</h3>
            <p>
              ZWANGA fournit une plateforme technologique permettant de mettre en
              relation des conducteurs et des passagers pour partager des trajets en
              covoiturage. Nous ne sommes pas un prestataire de transport et n'offrons
              pas directement de services de transport.
            </p>

            <h3>2.2. Services disponibles</h3>
            <ul>
              <li>
                <strong>Recherche de trajets :</strong> Les passagers peuvent rechercher
                et réserver des places dans des trajets proposés par des conducteurs
              </li>
              <li>
                <strong>Publication de trajets :</strong> Les conducteurs peuvent
                publier leurs trajets et proposer des places aux passagers
              </li>
              <li>
                <strong>Gestion des réservations :</strong> Système de réservation et
                de confirmation en temps réel
              </li>
              <li>
                <strong>Paiements sécurisés :</strong> Traitement des paiements entre
                passagers et conducteurs
              </li>
              <li>
                <strong>Système d'évaluation :</strong> Notation et commentaires après
                chaque trajet
              </li>
              <li>
                <strong>Support client :</strong> Assistance pour résoudre les
                problèmes et répondre aux questions
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>3. Tarification</h2>
            <h3>3.1. Prix des trajets</h3>
            <ul>
              <li>
                Les prix sont fixés librement par les conducteurs et exprimés par
                place réservée
              </li>
              <li>
                Les prix doivent être raisonnables et conformes aux pratiques du
                marché
              </li>
              <li>
                ZWANGA se réserve le droit de modérer ou de rejeter des prix jugés
                excessifs ou suspects
              </li>
              <li>
                Les prix sont indiqués en dollars américains (USD) ou en francs
                congolais (CDF) selon la région
              </li>
            </ul>

            <h3>3.2. Frais de service ZWANGA</h3>
            <p>
              ZWANGA prélève des frais de service sur chaque transaction pour couvrir
              les coûts d'exploitation de la plateforme :
            </p>
            <ul>
              <li>
                <strong>Pour les passagers :</strong> Frais de service de 10% à 15%
                du montant du trajet (selon le type de trajet)
              </li>
              <li>
                <strong>Pour les conducteurs :</strong> Commission de 12% à 18% sur
                chaque place vendue
              </li>
            </ul>
            <p>
              Les frais exacts sont clairement indiqués avant la confirmation de la
              réservation. Les frais peuvent varier selon les promotions ou les
              programmes spéciaux en cours.
            </p>

            <h3>3.3. Taxes</h3>
            <p>
              Tous les prix indiqués sont hors taxes. Les taxes applicables (TVA,
              etc.) seront ajoutées au moment du paiement conformément à la
              réglementation en vigueur en République Démocratique du Congo.
            </p>
          </section>

          <section className={styles.section}>
            <h2>4. Modalités de paiement</h2>
            <h3>4.1. Méthodes de paiement acceptées</h3>
            <ul>
              <li>
                <strong>Cartes bancaires :</strong> Visa, Mastercard, et autres cartes
                internationales
              </li>
              <li>
                <strong>Paiements mobiles :</strong> Mobile Money (Orange Money, M-Pesa,
                etc.)
              </li>
              <li>
                <strong>Portefeuille électronique :</strong> Compte ZWANGA avec
                solde crédité
              </li>
              <li>
                <strong>Espèces :</strong> Uniquement pour certains trajets spécifiques
                (à confirmer au moment de la réservation)
              </li>
            </ul>

            <h3>4.2. Traitement des paiements</h3>
            <ul>
              <li>
                Le paiement est débité immédiatement lors de la confirmation de la
                réservation par le conducteur
              </li>
              <li>
                Le montant est mis en attente (escrow) jusqu'à la completion du trajet
              </li>
              <li>
                Le paiement est libéré au conducteur dans les 24 à 48 heures suivant
                la completion du trajet
              </li>
              <li>
                En cas de litige, le paiement peut être retenu jusqu'à résolution
              </li>
            </ul>

            <h3>4.3. Sécurité des paiements</h3>
            <p>
              Tous les paiements sont traités de manière sécurisée via des processeurs
              de paiement certifiés PCI-DSS. ZWANGA ne stocke pas les informations de
              carte bancaire complètes sur ses serveurs.
            </p>
          </section>

          <section className={styles.section}>
            <h2>5. Politique d'annulation et de remboursement</h2>
            <h3>5.1. Annulation par le passager</h3>
            <ul>
              <li>
                <strong>Plus de 24 heures avant le départ :</strong> Remboursement
                intégral (moins les frais de service)
              </li>
              <li>
                <strong>Entre 2 et 24 heures avant le départ :</strong> Remboursement
                de 50% du montant du trajet
              </li>
              <li>
                <strong>Moins de 2 heures avant le départ :</strong> Aucun remboursement
                (sauf cas de force majeure)
              </li>
              <li>
                <strong>Après le départ :</strong> Aucun remboursement
              </li>
            </ul>

            <h3>5.2. Annulation par le conducteur</h3>
            <ul>
              <li>
                <strong>Plus de 4 heures avant le départ :</strong> Remboursement
                intégral au passager
              </li>
              <li>
                <strong>Moins de 4 heures avant le départ :</strong> Remboursement
                intégral + compensation de 20% du montant du trajet pour le passager
              </li>
              <li>
                <strong>Annulation répétée :</strong> Le conducteur peut être suspendu
                ou banni de la plateforme
              </li>
            </ul>

            <h3>5.3. Cas de force majeure</h3>
            <p>
              En cas de force majeure (accident, intempéries, problèmes mécaniques
              majeurs, etc.), les remboursements sont traités au cas par cas. Les
              utilisateurs doivent contacter le support dans les plus brefs délais.
            </p>

            <h3>5.4. Délais de remboursement</h3>
            <p>
              Les remboursements sont traités dans un délai de 5 à 10 jours ouvrables
              et crédités selon la méthode de paiement utilisée initialement.
            </p>
          </section>

          <section className={styles.section}>
            <h2>6. Garanties et responsabilités</h2>
            <h3>6.1. Garantie de service</h3>
            <p>
              ZWANGA s'efforce de fournir un service fiable et de qualité. Cependant,
              nous ne garantissons pas :
            </p>
            <ul>
              <li>
                La disponibilité ininterrompue de la plateforme
              </li>
              <li>
                L'exactitude absolue des informations fournies par les utilisateurs
              </li>
              <li>
                La ponctualité ou le comportement des conducteurs ou passagers
              </li>
              <li>
                La qualité ou la sécurité des véhicules
              </li>
            </ul>

            <h3>6.2. Limitation de responsabilité</h3>
            <p>
              ZWANGA n'est pas responsable des dommages directs, indirects, accessoires
              ou consécutifs résultant de l'utilisation de la plateforme, y compris
              mais sans s'y limiter :
            </p>
            <ul>
              <li>
                Accidents de la route ou blessures
              </li>
              <li>
                Perte ou dommage aux biens personnels
              </li>
              <li>
                Retards ou annulations de trajets
              </li>
              <li>
                Pertes financières résultant de transactions
              </li>
            </ul>

            <h3>6.3. Assurance</h3>
            <p>
              Les conducteurs sont responsables de maintenir une assurance véhicule
              valide couvrant l'utilisation de leur véhicule à des fins de covoiturage.
              ZWANGA recommande fortement une assurance complémentaire spécifique au
              covoiturage.
            </p>
          </section>

          <section className={styles.section}>
            <h2>7. Système d'évaluation et de notation</h2>
            <h3>7.1. Évaluations</h3>
            <ul>
              <li>
                Après chaque trajet complété, les utilisateurs peuvent évaluer leur
                expérience (note de 1 à 5 étoiles)
              </li>
              <li>
                Les évaluations sont publiques et visibles par tous les utilisateurs
              </li>
              <li>
                Les utilisateurs peuvent laisser des commentaires détaillés
              </li>
            </ul>

            <h3>7.2. Modération</h3>
            <p>
              ZWANGA se réserve le droit de modérer, modifier ou supprimer les
              évaluations qui :
            </p>
            <ul>
              <li>
                Contiennent des propos injurieux, discriminatoires ou offensants
              </li>
              <li>
                Violent les droits de propriété intellectuelle
              </li>
              <li>
                Sont manifestement faux ou malveillants
              </li>
            </ul>

            <h3>7.3. Conséquences des mauvaises évaluations</h3>
            <p>
              Les utilisateurs avec des évaluations moyennes inférieures à 3 étoiles
              peuvent être soumis à des restrictions ou à une suspension de leur
              compte.
            </p>
          </section>

          <section className={styles.section}>
            <h2>8. Support client</h2>
            <h3>8.1. Disponibilité</h3>
            <p>
              Notre équipe de support est disponible :
            </p>
            <ul>
              <li>
                <strong>Email :</strong> support@zwanga.com (réponse sous 24-48h)
              </li>
              <li>
                <strong>Chat en ligne :</strong> Disponible de 8h à 20h (heure locale)
              </li>
              <li>
                <strong>Téléphone :</strong> +243 XXX XXX XXX (lun-ven, 9h-18h)
              </li>
            </ul>

            <h3>8.2. Types de support</h3>
            <ul>
              <li>
                Assistance technique pour l'utilisation de la plateforme
              </li>
              <li>
                Résolution de litiges entre utilisateurs
              </li>
              <li>
                Questions sur les paiements et remboursements
              </li>
              <li>
                Signalement de comportements inappropriés
              </li>
            </ul>

            <h3>8.3. Résolution de litiges</h3>
            <p>
              En cas de litige entre utilisateurs, ZWANGA agit en tant que médiateur.
              Nous examinerons les preuves fournies par les deux parties et prendrons
              une décision équitable. Les décisions de ZWANGA sont finales et
              contraignantes.
            </p>
          </section>

          <section className={styles.section}>
            <h2>9. Modifications des services</h2>
            <p>
              ZWANGA se réserve le droit de modifier, suspendre ou interrompre tout ou
              partie des services à tout moment, avec ou sans préavis. Nous nous
              efforçons de minimiser les interruptions de service et d'informer les
              utilisateurs des modifications importantes.
            </p>
          </section>

          <section className={styles.section}>
            <h2>10. Propriété intellectuelle</h2>
            <p>
              Tous les contenus, fonctionnalités et technologies de la plateforme
              ZWANGA sont la propriété exclusive de ZWANGA ou de ses concédants de
              licence. L'utilisation de la plateforme ne vous confère aucun droit de
              propriété sur ces éléments.
            </p>
          </section>

          <section className={styles.section}>
            <h2>11. Contact</h2>
            <p>
              Pour toute question concernant cette politique de ventes et services,
              contactez-nous :
            </p>
            <div className={styles.contactInfo}>
              <p>
                <strong>ZWANGA</strong>
                <br />
                Email : <a href="mailto:sales@zwanga.com">sales@zwanga.com</a>
                <br />
                Support : <a href="mailto:support@zwanga.com">support@zwanga.com</a>
                <br />
                Téléphone : +243 XXX XXX XXX
                <br />
                Adresse : Kinshasa, République Démocratique du Congo
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

