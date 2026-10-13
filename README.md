# Redux Toolkit TypeScript Example

This example shows how to integrate Next.js with [Redux Toolkit](https://redux-toolkit.js.org).

**Redux Toolkit**(also known as "RTK" for short) provides a standardized way to write Redux logic. It includes utilities that help simplify many common use cases, including [store setup](https://redux-toolkit.js.org/api/configureStore), [creating reducers and writing immutable update logic](https://redux-toolkit.js.org/api/createreducer), and even [creating entire "slices" of state at once](https://redux-toolkit.js.org/api/createslice). This example showcases each of these features in conjunction with Next.js.

## Deploy Your Own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vercel/next.js/tree/canary/examples/with-redux&project-name=with-redux&repository-name=with-redux)

## How to Use

Execute [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app) with [npm](https://docs.npmjs.com/cli/init), [Yarn](https://yarnpkg.com/lang/en/docs/cli/create/), or [pnpm](https://pnpm.io) to bootstrap the example:

```bash
npx create-next-app --example with-redux with-redux-app
```

```bash
yarn create next-app --example with-redux with-redux-app
```

```bash
pnpm create next-app --example with-redux with-redux-app
```

Deploy it to the cloud with [Vercel](https://vercel.com/new?utm_source=github&utm_medium=readme&utm_campaign=next-example) ([Documentation](https://nextjs.org/docs/deployment)).
# Modification et reprogrammation des demandes — 8 octobre 2026

La page `/trip-requests` permet de modifier les demandes en attente et de
reprogrammer les demandes expirées avec un créneau futur. Les demandes annulées
ou déjà prises en charge sont protégées. Les anciennes offres en attente sont
invalidées par le backend ; une recherche immédiate reprogrammée hors de son
horizon devient classique.

`lib/features/tripRequests/requestEdit.ts` construit uniquement les champs modifiés
et ajoute `expectedUpdatedAt` depuis l'ouverture du formulaire. La saisie utilise
les heures locales du navigateur ; les heures inchangées gardent leurs secondes
et leur valeur UTC originale. Les erreurs métier/conflits sont affichées.
L'endpoint admin existant `PUT /admin/trip-requests/:id` est conservé.

Vérification : TypeScript sans émission et
`node --test lib/features/tripRequests/requestEdit.test.cjs` (3 tests réussis).
Pas de déploiement ni d'essai navigateur connecté à la production. Déployer le
backend associé avant cette interface. Les historiques financiers ne sont pas
modifiés par cette action.

