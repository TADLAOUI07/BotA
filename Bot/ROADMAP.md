# Roadmap Complete - Bot Support + CRM + Marketing AI

Ce fichier est la reference projet. Avant toute nouvelle evolution importante, relire cette roadmap pour garder le cap et eviter d'ajouter des features sur une base fragile.

## Vision finale

Construire un assistant e-commerce intelligent qui centralise:

- Support client Gmail avec validation Telegram.
- CRM Shopify propre et conforme.
- Campagnes emailing via Gmail/SendGrid.
- Analytics email, Shopify et business.
- Scan des KPI Ads via MCP.
- Analyse IA des performances marketing.
- Generation IA de campagnes email avec design, copywriting et CTA.
- Validation humaine par Telegram avant envoi.
- Boucle d'optimisation Ads + Email + Shopify.

Flux cible:

```text
Gmail + Shopify + Ads MCP
  -> Analyse IA
  -> Segments clients
  -> Campagne email designee
  -> Validation Telegram
  -> Envoi SendGrid
  -> Analytics
  -> Optimisation continue
```

## Principes de livraison

- Securite avant nouvelles features.
- Donnees propres avant IA.
- Consentement RGPD avant emailing.
- Validation humaine obligatoire avant envoi marketing.
- Campagnes en batch/reprise, pas en une seule execution Apps Script.
- L'IA propose et explique; l'utilisateur valide.

## Phase 0 - Cadrage produit

Objectif: definir exactement ce que le bot doit faire.

A faire:

- Definir les plateformes Ads a connecter: Meta Ads, Google Ads, TikTok Ads ou autre MCP disponible.
- Definir les regles support: remboursement, lien digital, mauvais email, commande introuvable, produit physique.
- Definir les segments Shopify: new, active, VIP, inactive, churned, product buyer, repeat buyer.
- Definir la politique RGPD: consentement, tracking, suppression, retention.
- Definir le ton de marque pour les emails IA.
- Definir les KPI business prioritaires: ROAS, CPA, CTR, CPC, conversion, revenus email.

Livrable: specification fonctionnelle + checklist de mise en production.

## Phase 1 - Securiser le bot actuel

Objectif: rendre la base exploitable sans risque majeur.

A corriger:

- Ne plus logger l'URL webhook complete avec `WEBHOOK_KEY`.
- Ajouter une validation Telegram plus forte avec `secret_token` si possible.
- Redacter `SENDGRID_API_KEY` dans `backupConfiguration()`.
- Reduire les logs contenant emails et donnees personnelles.
- Revoir les scopes et le modele public de `appsscript.json`.
- Ajouter un cleanup des cles temporaires `pending_*`, `campaign_*`, `pdf_select_*`.
- Securiser les endpoints de tracking.

Livrable: bot support securise minimum.

## Phase 2 - Stabiliser le support Gmail

Objectif: rendre le support semi-automatique fiable.

A faire:

- Unifier la logique de `Rules.js` et `ReplyEngine.js`.
- Corriger le cas spam: si spam detecte, ne pas generer de reponse normale.
- Brancher `Gmail.js` sur `sendSupportReply()` de `EmailProvider.js`.
- Ameliorer les templates FR/EN.
- Ajouter statuts clairs: pending, approved, drafted, ignored, error.
- Ajouter nettoyage automatique des emails pending trop anciens.
- Verifier la limite Telegram `callback_data`.

Livrable: support Gmail + Telegram robuste.

## Phase 3 - CRM Shopify propre

Objectif: avoir une vraie base client exploitable et conforme.

A faire:

- Importer tous les clients Shopify avec pagination.
- Recuperer l'historique commandes.
- Recuperer les produits achetes.
- Calculer total depense, nombre commandes, date dernier achat, panier moyen, produits preferes.
- Ne pas mettre `consent: true` automatiquement.
- Lire le vrai statut marketing consent depuis Shopify si disponible.
- Creer segments: new, active, VIP, inactive, churned, product buyer, repeat buyer.

Livrable: CRM Shopify propre dans Google Sheets.

## Phase 4 - Emailing production

Objectif: transformer la partie campagne en systeme fiable.

A faire:

- Creer une queue d'envoi batchee.
- Ne plus envoyer toute la campagne dans un seul run.
- Ajouter preview email avant envoi.
- Ajouter boutons Telegram: valider, modifier, annuler, programmer.
- Securiser HTML et URLs des templates.
- Corriger le tracking avec tokens opaques au lieu de Base64 email.
- Gerer de vrais compteurs: envoyes, erreurs, ouvertures, clics, desinscriptions.
- Utiliser SendGrid comme provider principal marketing.

Livrable: campagnes email fiables et validees humainement.

## Phase 5 - Analytics business

Objectif: mesurer les vrais resultats.

A faire:

- Ameliorer analytics email.
- Relier campagnes email aux contacts Shopify.
- Ajouter conversions Shopify apres clic email.
- Calculer open rate, click rate, revenue par campagne, conversion rate, unsubscribe rate, revenue par segment.
- Creer un dashboard Telegram plus oriente business.
- Ajouter rapport quotidien/hebdo business.

Livrable: dashboard business support + marketing.

## Phase 6 - Integration Ads MCP

Objectif: scanner les KPI Ads via MCP.

Modules possibles:

- `AdsMCP.js`
- `AdsKpiNormalizer.js`

KPI a recuperer:

- Spend.
- Impressions.
- Clicks.
- CTR.
- CPC.
- CPM.
- Conversions.
- CPA.
- ROAS.
- Campagne.
- Adset.
- Audience.
- Creative.
- Periode.

A faire:

- Connecter le MCP Ads disponible.
- Normaliser les donnees selon plateforme.
- Stocker ou cacher les snapshots KPI utiles.
- Exposer une commande Telegram de type `/ads_report`.

Livrable: donnees Ads structurees dans le bot.

## Phase 7 - AI Marketing Brain

Objectif: utiliser l'IA pour interpreter les donnees.

Modules possibles:

- `MarketingAI.js`
- `RecommendationEngine.js`

L'IA doit analyser:

- Campagnes Ads performantes.
- Campagnes Ads faibles.
- Produits qui vendent.
- Segments Shopify.
- Resultats email passes.

Elle doit proposer:

- Campagne promo.
- Relance inactifs.
- Upsell.
- Cross-sell.
- Campagne VIP.
- Test A/B.
- Optimisation Ads.
- Audience a couper.
- Budget a deplacer.

Livrable: recommandations marketing automatiques.

## Phase 8 - AI Campaign Designer

Objectif: generer automatiquement une campagne emailing complete.

L'IA doit generer:

- Titre campagne.
- Sujet email.
- Preheader.
- Message.
- CTA.
- Design HTML.
- Segment cible.
- Offre.
- Variante A/B.
- Justification strategique.

Telegram doit afficher:

- Resume de l'opportunite.
- Segment cible.
- Nombre de contacts.
- Sujet email.
- Apercu.
- Bouton `Valider & Envoyer`.
- Bouton `Modifier`.
- Bouton `Annuler`.

Livrable: campagne email generee par IA avec validation Telegram.

## Phase 9 - Boucle d'optimisation

Objectif: fermer la boucle Ads -> Email -> Shopify.

A faire:

- Comparer depenses Ads et revenus Shopify.
- Mesurer revenus generes par email.
- Detecter produits gagnants.
- Detecter audiences faibles.
- Recommander augmentation budget, coupure campagne, relance email, promo, changement d'angle creatif.
- Generer rapport IA hebdomadaire.

Livrable: assistant d'optimisation marketing.

## Phase 10 - Tests, documentation, livraison

Objectif: livrer un projet complet maintenable.

A faire:

- Tests manuels Apps Script.
- Scenarios support Gmail.
- Scenarios campagne email.
- Scenarios desinscription RGPD.
- Scenarios Shopify.
- Scenarios MCP Ads.
- Documentation setup.
- Documentation Script Properties.
- Runbook incident.
- Checklist production.

Livrable: version stable prete a utiliser.

## Plan de developpement par sprints

Ce decoupage sert a developper le projet sans oublier de fonctionnalites et sans empiler des features sur une base instable.

Regle generale:

- Un sprint doit livrer une version testable.
- Aucun sprint ne doit commencer si les criteres critiques du sprint precedent ne sont pas valides.
- Les sprints IA et Ads MCP ne commencent qu'apres securite, CRM, consentement et emailing fiable.
- Chaque sprint doit finir avec tests manuels, verification logs et mise a jour documentation si necessaire.

### Sprint 0 - Audit, cadrage et environnement

But:

- Comprendre l'existant, figer la vision produit et preparer l'environnement de travail.

Fonctionnalites / taches:

- Relire `README.md`, `ROADMAP.md` et tous les modules existants.
- Identifier les Script Properties necessaires.
- Definir les comptes a connecter: Gmail, Telegram, Shopify, SendGrid, Ads MCP.
- Definir les environnements: dev, test, production si possible.
- Creer une checklist de lancement.

Critere de validation:

- Le perimetre est clair.
- Les credentials necessaires sont listes.
- Les risques critiques sont connus.

Livrable:

- Projet compris, roadmap validee, backlog priorise.

### Sprint 1 - Securite webhook, secrets et logs

But:

- Corriger les risques critiques avant toute nouvelle feature.

Fonctionnalites / taches:

- Supprimer le log de l'URL webhook contenant `WEBHOOK_KEY`.
- Ajouter une strategie de rotation de `WEBHOOK_KEY`.
- Ajouter `SENDGRID_API_KEY` aux secrets redactes dans `Backup.js`.
- Reduire les emails et donnees personnelles dans `Logger.js` et `SheetSetup.js`.
- Etudier et ajouter si possible `secret_token` Telegram.
- Documenter le risque `ANYONE_ANONYMOUS` + `USER_DEPLOYING`.

Critere de validation:

- Aucun secret n'est logge.
- Les backups ne contiennent pas de cle API en clair.
- Les logs recents ne revelent pas inutilement de donnees personnelles.

Livrable:

- Base securisee minimum.

### Sprint 2 - Stabilisation support Gmail + Telegram

But:

- Rendre le support client fiable avant de toucher au marketing.

Fonctionnalites / taches:

- Unifier la logique entre `Rules.js` et `ReplyEngine.js`.
- Corriger le flux spam: pas de reponse automatique normale si spam detecte.
- Brancher `sendApprovedReply()` sur `sendSupportReply()`.
- Verifier les labels Gmail et transitions pending/done/error.
- Ajouter cleanup des `pending_*` expires.
- Verifier les limites Telegram `callback_data`.
- Ameliorer messages Telegram de validation.

Critere de validation:

- Un email support arrive dans Telegram.
- Les boutons approve, draft, ignore, edit fonctionnent.
- Un spam n'est pas propose comme reponse normale.
- Les pending expires sont nettoyes.

Livrable:

- Support semi-automatique stable.

### Sprint 3 - Produits digitaux et PDF

But:

- Finaliser le flux produits digitaux avec Drive/PDF.

Fonctionnalites / taches:

- Verifier `PRODUCTS_FOLDER_ID`.
- Securiser upload PDF depuis Telegram.
- Ajouter limites de taille fichier.
- Ajouter cleanup des `pdf_select_*`.
- Verifier `Approve + PDF`.
- Ajouter logs propres pour les envois avec piece jointe.

Critere de validation:

- Un PDF peut etre envoye via Telegram et stocke dans Drive.
- Le bot peut joindre un PDF a une reponse client.
- Les selections PDF expirees ne restent pas en properties.

Livrable:

- Support produits digitaux operationnel.

### Sprint 4 - CRM Shopify propre et consentement

But:

- Construire une base client fiable et conforme.

Fonctionnalites / taches:

- Ajouter pagination Shopify pour clients/commandes.
- Importer historique commandes utile.
- Stocker total depense, nombre commandes, derniere commande, produits achetes.
- Ne plus mettre `consent: true` automatiquement.
- Lire le statut marketing consent Shopify si disponible.
- Definir segments: new, active, VIP, inactive, churned, product buyer, repeat buyer.
- Ajouter verification doublons et emails invalides.

Critere de validation:

- Les clients Shopify sont importes sans doublons.
- Le consentement marketing est correct ou false par defaut.
- Les segments sont calcules.

Livrable:

- CRM Shopify exploitable.

### Sprint 5 - Emailing production et queue d'envoi

But:

- Remplacer l'envoi campagne en un seul run par un systeme fiable.

Fonctionnalites / taches:

- Creer une queue de campagne.
- Envoyer par batch avec reprise automatique.
- Ajouter statut campagne: pending, scheduled, sending, paused, completed, failed, cancelled.
- Ajouter compteurs reels: sent, failed, skipped, unsubscribed.
- Utiliser SendGrid comme provider principal marketing.
- Garder Gmail comme fallback limite si necessaire.
- Ajouter preview Telegram avant envoi.

Critere de validation:

- Une campagne de test peut etre envoyee en batch.
- Une execution interrompue peut reprendre.
- Les compteurs correspondent aux envois reels.

Livrable:

- Moteur emailing fiable.

### Sprint 6 - Templates email, tracking et RGPD

But:

- Rendre les emails marketing propres, securises et conformes.

Fonctionnalites / taches:

- Escaper le contenu libre dans `EmailTemplates.js`.
- Valider toutes les URLs: CTA, hero image, articles, unsubscribe.
- Remplacer Base64 email par token opaque signe ou stocke.
- Securiser `track_open` et `track_click`.
- Ameliorer page unsubscribe.
- Etendre suppression RGPD aux logs/analytics ou anonymiser.
- Eviter double tracking SendGrid + tracking custom si non desire.

Critere de validation:

- Aucun email n'apparait en clair dans les URLs de tracking.
- Les liens dangereux sont rejetes.
- La desinscription fonctionne.
- Un contact supprime ne reste pas exploitable dans la base marketing.

Livrable:

- Emailing conforme et tracking securise.

### Sprint 7 - Analytics business

But:

- Passer de statistiques techniques a des indicateurs business.

Fonctionnalites / taches:

- Suivre ouvertures, clics, desinscriptions, erreurs.
- Relier campagne email, contact et segment.
- Ajouter revenus Shopify apres campagne si possible.
- Calculer open rate, click rate, conversion rate, revenue per campaign.
- Ameliorer `/analytics` et `/dashboard`.
- Ajouter rapport business quotidien/hebdomadaire.

Critere de validation:

- Une campagne affiche ses resultats utiles.
- Le dashboard Telegram montre support, email et business.
- Les donnees sont coherentes avec Sheets/SendGrid.

Livrable:

- Tableau de bord business.

### Sprint 8 - Integration Ads MCP

But:

- Connecter le bot aux KPI publicitaires via MCP.

Fonctionnalites / taches:

- Identifier le MCP Ads disponible et ses schemas.
- Creer `AdsMCP.js`.
- Creer `AdsKpiNormalizer.js`.
- Recuperer spend, impressions, clicks, CTR, CPC, CPM, conversions, CPA, ROAS.
- Normaliser campagnes, adsets, creatives, audiences, periode.
- Ajouter commande Telegram `/ads_report`.
- Stocker snapshots KPI utiles.

Critere de validation:

- Le bot recupere les KPI Ads.
- Les KPI sont normalises dans un format stable.
- Un rapport Ads peut etre envoye sur Telegram.

Livrable:

- Module Ads MCP operationnel.

### Sprint 9 - AI Marketing Brain

But:

- Ajouter une couche IA qui analyse Ads + Shopify + Email.

Fonctionnalites / taches:

- Creer `MarketingAI.js`.
- Creer `RecommendationEngine.js`.
- Definir prompts et formats JSON de sortie.
- Analyser campagnes Ads performantes/faibles.
- Croiser Ads avec produits Shopify et resultats email.
- Generer recommandations: couper, augmenter budget, relancer, upsell, cross-sell, promo.
- Ajouter commande Telegram `/ai_recommendations`.

Critere de validation:

- L'IA produit des recommandations structurees.
- Chaque recommandation contient raison, KPI source, segment cible et action proposee.
- Aucune action n'est executee automatiquement sans validation.

Livrable:

- Assistant de recommandations marketing.

### Sprint 10 - AI Campaign Designer

But:

- Generer une campagne email complete avec l'aide de l'IA.

Fonctionnalites / taches:

- Generer sujet, preheader, body, CTA, offre, segment et justification.
- Generer un design HTML compatible avec `EmailTemplates.js`.
- Ajouter variantes A/B.
- Ajouter preview Telegram.
- Ajouter boutons: `Valider & Envoyer`, `Modifier`, `Annuler`, `Programmer`.
- Stocker les campagnes IA en pending avant envoi.

Critere de validation:

- L'IA genere une campagne complete.
- L'utilisateur peut la valider ou l'annuler depuis Telegram.
- L'envoi utilise la queue d'emailing du Sprint 5.

Livrable:

- Generation IA de campagnes email.

### Sprint 11 - Boucle d'optimisation Ads -> Email -> Shopify

But:

- Fermer la boucle d'apprentissage marketing.

Fonctionnalites / taches:

- Comparer depenses Ads et revenus Shopify.
- Mesurer revenus generes par email.
- Detecter audiences faibles et produits gagnants.
- Recommander ajustements budget/creatif/audience.
- Generer rapport IA hebdomadaire.
- Historiser les recommandations et resultats.

Critere de validation:

- Le bot peut expliquer quelle action marketing a apporte du revenu.
- Le rapport IA propose des optimisations basees sur KPI.
- Les recommandations sont historisees.

Livrable:

- Systeme d'optimisation continue.

### Sprint 12 - Tests, documentation et livraison finale

But:

- Livrer une version stable et maintenable.

Fonctionnalites / taches:

- Tester chaque commande Telegram.
- Tester support Gmail complet.
- Tester Shopify sync.
- Tester campagne email complete.
- Tester unsubscribe/delete/export RGPD.
- Tester Ads MCP.
- Tester recommandations IA.
- Documenter setup Apps Script.
- Documenter Script Properties.
- Documenter runbook incident.
- Creer checklist production.

Critere de validation:

- Tous les scenarios critiques passent.
- La documentation permet de redeployer le bot.
- Les limites connues sont documentees.

Livrable:

- Version complete prete a utiliser.

## Definition of Done par sprint

Chaque sprint est termine seulement si:

- Le code est relu.
- Les erreurs de lint evidentes sont corrigees.
- Des tests logiciel sont executes en fin de sprint.
- Les resultats des tests sont documentes dans le livrable du sprint ou dans les notes de livraison.
- Les chemins critiques sont testes manuellement.
- Les tests doivent couvrir au minimum les fonctionnalites modifiees pendant le sprint.
- Si le sprint touche Apps Script, tester les fonctions principales depuis l'editeur Apps Script ou via scenario manuel equivalent.
- Si le sprint touche Telegram, tester la commande ou le bouton concerne.
- Si le sprint touche Shopify, SendGrid, Ads MCP ou IA, tester au moins un scenario nominal et un scenario d'erreur.
- Les logs ne contiennent pas de secrets.
- La documentation impactee est mise a jour.
- Les changements respectent l'ordre de cette roadmap.

Tests attendus par type de sprint:

- Sprint documentation/cadrage: validation documentaire, coherence roadmap, checklist complete.
- Sprint securite: tests secrets/logs, webhook invalide, webhook valide, acces non autorise.
- Sprint support: tests scan Gmail, approval Telegram, draft, ignore, erreur, spam.
- Sprint Shopify/CRM: tests import client, doublon, consentement false par defaut, email invalide.
- Sprint emailing: tests preview, queue, batch, reprise, unsubscribe, erreur provider.
- Sprint analytics: tests tracking, agregations, dashboard, donnees incoherentes.
- Sprint Ads MCP: tests connexion MCP, donnees vides, KPI normalises, erreur API.
- Sprint IA: tests format JSON, recommandation valide, refus d'action sans validation humaine.
- Sprint livraison: tests bout-en-bout complets.

## Passage au sprint suivant (Gate)

Le developpement suit les sprints comme un pipeline. Le passage du Sprint N au Sprint N+1 est un acte de qualification, pas une simple question d'ordre.

Qui decide:

- Dans Cursor, **l'assistant** tranche si le sprint precedent est **reellement termine** au sens de la Definition of Done.
- **L'humain peut bloquer** tout deploiement en production ou tout changement sensible, mais il ne doit pas "sauter" un sprint sans mise a jour ecrite de la roadmap.

Exception documentee:

- Un **re-priorisation** peut exister, mais elle doit etre tracee comme decision explicite.

Critere pour avancer:

- **DoD complet** du sprint en cours, y compris les **tests logiciel** prevus.
- **Documentation du sprint** a jour: livrable `SPRINT-*-*.md` ou notes de livraison ajoutees avec resultats de tests.
- **Aucune regression majeure connue** sur les fonctionnalites des sprints precedents.
- Si une exigence critique de securite/compliance n'est pas encore remplie dans le code, on peut avancer seulement pour des sprints **non dependants**, mais on ne doit pas commencer un sprint marketing/IA/Ads si les fondations prerequises ne sont pas validees.

Decision en cas d'echec:

- Le sprint n'est pas clos. On corrige, on reteste, on met a jour les documents, puis seulement apres on passe au sprint suivant.

## Ordre strict de travail

1. Securiser le bot actuel.
2. Stabiliser support Gmail.
3. Nettoyer Shopify CRM et consentement.
4. Refaire emailing en mode production.
5. Ajouter analytics business.
6. Brancher Ads MCP.
7. Ajouter intelligence IA.
8. Ajouter design automatique des campagnes.
9. Ajouter optimisation continue.
10. Tester et documenter.

## Notes importantes

- Ne pas brancher Ads MCP et IA avant d'avoir des donnees Shopify/email propres.
- Ne pas envoyer de campagne marketing sans consentement explicite.
- Ne pas utiliser les emails en clair dans les URLs de tracking.
- Ne pas automatiser l'envoi marketing sans validation Telegram au debut.
- Ne pas ajouter de nouvelles features avant de corriger les risques critiques de securite.
