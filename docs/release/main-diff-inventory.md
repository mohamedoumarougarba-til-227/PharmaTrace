# Inventaire complet des différences avec main

Base locale : `f64f2c4cf5fd2d4e47816692d1350360f54196c5` (main distant identique au contrôle accepté du gate 3A).
Préparation métier déjà installée + préparation locale open source ; aucun push/merge.
Actualisé au gate 3B du 5 novembre 2026 : les 46 archives/métadonnées du manifeste sont retirées du suivi local, avec originaux et sauvegardes vérifiés, sans effacement historique.
Comparaison de main avec l’index préparé pour le commit signé, sans détection de renommage.

```text
A	.github/ISSUE_TEMPLATE/bug.yml
A	.github/ISSUE_TEMPLATE/config.yml
A	.github/ISSUE_TEMPLATE/improvement.yml
A	.github/pull_request_template.md
A	.github/workflows/ci.yml
M	.gitignore
A	.nvmrc
A	CHANGELOG.md
A	CONTRIBUTING.md
A	CREDITS.md
A	LICENSE
A	NOTICE
M	README.md
A	SECURITY.md
A	THIRD_PARTY_NOTICES.md
M	app/PharmaTrace/.env.example
M	app/PharmaTrace/app/(agent-dph)/_layout.tsx
M	app/PharmaTrace/app/(agent-dph)/index.tsx
M	app/PharmaTrace/app/(agent-dph)/lots.tsx
M	app/PharmaTrace/app/(auth)/login.tsx
M	app/PharmaTrace/app/(fabricant)/[id].tsx
M	app/PharmaTrace/app/(fabricant)/_layout.tsx
M	app/PharmaTrace/app/(fabricant)/compte.tsx
M	app/PharmaTrace/app/(fabricant)/demandes.tsx
M	app/PharmaTrace/app/(fabricant)/index.tsx
M	app/PharmaTrace/app/(fabricant)/nouveau-lot.tsx
M	app/PharmaTrace/app/(fabricant)/nouveau-transfert.tsx
M	app/PharmaTrace/app/(fabricant)/transferts.tsx
M	app/PharmaTrace/app/(pharmacie)/_layout.tsx
M	app/PharmaTrace/app/(pharmacie)/compte.tsx
M	app/PharmaTrace/app/(pharmacie)/demandes.tsx
M	app/PharmaTrace/app/(pharmacie)/index.tsx
M	app/PharmaTrace/app/(pharmacie)/stock.tsx
M	app/PharmaTrace/app/(pharmacie)/transferts.tsx
M	app/PharmaTrace/app/(pharmacie)/verifier.tsx
M	app/PharmaTrace/app/(public)/verify.tsx
M	app/PharmaTrace/app/_layout.tsx
M	app/PharmaTrace/app/index.tsx
A	app/PharmaTrace/assets/brand/lot-illustration.svg
A	app/PharmaTrace/assets/brand/mark.svg
M	app/PharmaTrace/assets/images/adaptive-icon.png
M	app/PharmaTrace/assets/images/favicon.png
M	app/PharmaTrace/assets/images/icon.png
M	app/PharmaTrace/assets/images/medicament.png
M	app/PharmaTrace/assets/images/splash-screen.png
A	app/PharmaTrace/components/DemoBanner.tsx
A	app/PharmaTrace/components/VerificationNotice.tsx
A	app/PharmaTrace/lib/businessRole.ts
A	app/PharmaTrace/lib/businessWorkflows.ts
M	app/PharmaTrace/lib/supabase.ts
A	app/PharmaTrace/lib/verification.ts
A	app/PharmaTrace/lib/workflowReads.ts
M	app/PharmaTrace/package.json
A	app/PharmaTrace/scripts/check-export.cjs
A	app/PharmaTrace/scripts/check-public.cjs
A	app/PharmaTrace/scripts/copy-notices.cjs
A	app/PharmaTrace/scripts/fresh-migration-plan.cjs
A	app/PharmaTrace/scripts/prepare-business-fresh-replay.cjs
A	app/PharmaTrace/scripts/prepare-business-rehearsal.cjs
A	app/PharmaTrace/scripts/prepare-fresh-install.cjs
A	app/PharmaTrace/scripts/prepare-lot03-rehearsal.cjs
A	app/PharmaTrace/scripts/prepare-lot03b2-rehearsal.cjs
D	app/PharmaTrace/supabase/.temp/cli-latest
D	app/PharmaTrace/supabase/.temp/gotrue-version
D	app/PharmaTrace/supabase/.temp/pooler-url
D	app/PharmaTrace/supabase/.temp/postgres-version
D	app/PharmaTrace/supabase/.temp/project-ref
D	app/PharmaTrace/supabase/.temp/rest-version
D	app/PharmaTrace/supabase/.temp/storage-migration
D	app/PharmaTrace/supabase/.temp/storage-version
A	app/PharmaTrace/supabase/migrations/20261027153134_harden_business_role_provisioning.sql
A	app/PharmaTrace/supabase/migrations/20261027205429_add_safe_verification_surfaces.sql
A	app/PharmaTrace/supabase/migrations/20261028232100_restrict_legacy_public_access.sql
A	app/PharmaTrace/supabase/migrations/20261029212749_harden_atomic_business_workflows.sql
A	app/PharmaTrace/supabase/pending/README.md
A	app/PharmaTrace/supabase/seed-demo.sql
A	app/PharmaTrace/supabase/tests/business_workflows.sql
A	app/PharmaTrace/supabase/tests/p02_before.sql
A	app/PharmaTrace/supabase/tests/p02_roles.sql
A	app/PharmaTrace/supabase/tests/p03_public_contract.sql
A	app/PharmaTrace/supabase/tests/p03a_additive.sql
A	app/PharmaTrace/supabase/tests/p03b2_legacy_compat.sql
A	app/PharmaTrace/tests/business-role.test.cjs
A	app/PharmaTrace/tests/business-workflows.test.cjs
A	app/PharmaTrace/tests/verification.test.cjs
A	docs/architecture.md
A	docs/archive/lot-03-monolithic-candidate.sql
A	docs/archive/lot-03b-restrictive-before-b1.sql
A	docs/archive/lot-03b2-guarded-preflight.sql
A	docs/assets-inventory.json
A	docs/assets-rights.md
A	docs/backlog.md
A	docs/communication.md
A	docs/database.md
A	docs/dependency-triage.md
A	docs/historical-material.md
A	docs/images/fabricant-demo.png
A	docs/images/pharmacie-demo.png
A	docs/images/social-preview.png
A	docs/images/social-preview.svg
A	docs/images/verification-demo.png
A	docs/installation.md
A	docs/known-limitations.md
A	docs/licenses/FontAwesome6-LICENSE.txt
A	docs/licenses/README.md
A	docs/licenses/expo-vector-icons-MIT.txt
A	docs/licenses/jsQR-Apache-2.0.txt
A	docs/licenses/shadcn-MIT.txt
A	docs/licensing.md
A	docs/lot-02-roles.md
A	docs/lot-03-public-contract.md
A	docs/lot-03a-additive.md
A	docs/lot-03b1-production.md
A	docs/lot-03b2-restriction.md
A	docs/phase-1-business-delivery.md
A	docs/phase-1-business-hardening.md
A	docs/phase-2-open-source-readiness.md
A	docs/proposals/LICENSE-Apache-2.0.txt
A	docs/proposals/NOTICE-Apache-2.0.txt
A	docs/release-plan.md
A	docs/release/github-about.json
A	docs/release/github-main-checks-ruleset.json
A	docs/release/github-security.json
A	docs/release/github-settings.json
A	docs/release/github-topics.json
A	docs/release/issues/01-accessible-scanner.md
A	docs/release/issues/02-install-guide.md
A	docs/release/issues/03-landing-keyboard.md
A	docs/release/issues/04-dependency-triage.md
A	docs/release/main-diff-inventory.md
A	docs/release/pr-body.md
A	docs/release/release-notes.md
A	docs/release/retain-local-manifest.json
A	docs/release/retain-local.cjs
A	docs/releases.md
A	docs/screenshots.md
A	docs/testing.md
A	landing/images/fabricant-demo.png
A	landing/images/pharmacie-demo.png
A	landing/images/verification-demo.png
M	landing/index.html
D	landing/maquettes/fabricant-nouveau-lot.png
D	landing/maquettes/patient-scanner-resultat-authentique.png
D	landing/maquettes/pharmacie-reception.png
D	landing/medias/Abdoul Raouf HAROUNA MOUSSA.jpeg
D	landing/medias/Mahamadou GARBA ZAKOU.jpeg
D	landing/medias/Mohamed OUMAROU GARBA.jpg
A	ressources/README.md
D	ressources/docs/PHASE_1_PRESELECTION/Etude Problematique Medicaments Contrefaits Niger PharmaTrace.pdf
D	ressources/docs/PHASE_1_PRESELECTION/Plan Traçabilite Architecture Blockchain PharmaTrace.pdf
A	ressources/docs/PHASE_1_PRESELECTION/README.md
D	ressources/docs/PHASE_1_PRESELECTION/video_site_vitrine.mp4
M	ressources/docs/PHASE_2_DEMIFINAL/README.md
D	ressources/docs/PHASE_2_DEMIFINAL/notes_demonstration.pdf
M	ressources/docs/PHASE_3_FINALE/README.md
D	ressources/docs/PHASE_3_FINALE/documentation_technique.pdf
D	ressources/docs/PHASE_3_FINALE/guide_utilisateur.pdf
D	ressources/docs/Projet attribué/CONSIGNES LIVRABLES ET PRESENTATION MBH2026.pdf
D	ressources/docs/Projet attribué/CONSIGNES LIVRABLES ET PRESENTATION MBH2026_page-0001.jpg
D	ressources/docs/Projet attribué/CONSIGNES LIVRABLES ET PRESENTATION MBH2026_page-0002.jpg
D	ressources/docs/Projet attribué/CONSIGNES LIVRABLES ET PRESENTATION MBH2026_page-0003.jpg
D	ressources/docs/Projet attribué/PROGRAMME-DU-MIABE-HACKATHON-2026.pdf
D	ressources/docs/Projet attribué/PROJET_N1_NIGER.md
D	ressources/docs/Projet attribué/PROJET_N1_NIGER.pdf
D	ressources/docs/Projet attribué/PROJET_N1_NIGER_Page_1.png
D	ressources/docs/Projet attribué/PROJET_N1_NIGER_Page_2.png
D	ressources/maquettesFigma/PharmatraceTrustGrid.make
D	ressources/maquettesFigma/PharmatraceTrustGrid.zip
D	ressources/maquettesFigma/images/Valider/login-compte.png
D	ressources/maquettesFigma/images/Valider/patient-scanner.png
D	ressources/maquettesFigma/images/fabricant-compte.png
D	ressources/maquettesFigma/images/fabricant-nouveau-lot.png
D	ressources/maquettesFigma/images/fabricant-qr-genere.png
D	ressources/maquettesFigma/images/fabricant-transfert.png
D	ressources/maquettesFigma/images/patient-scanner-resultat-authentique.png
D	ressources/maquettesFigma/images/patient-scanner-resultat-suspect.png
D	ressources/maquettesFigma/images/pharmacie-compte.png
D	ressources/maquettesFigma/images/pharmacie-reception.png
D	ressources/maquettesFigma/images/pharmacie-stock.png
D	ressources/maquettesFigma/images/pharmacie-transferts.png
D	ressources/medias/Abdoul Raouf HAROUNA MOUSSA.jpeg
D	ressources/medias/Mahamadou GARBA ZAKOU.jpeg
D	ressources/medias/Mohamed OUMAROU GARBA.jpg
```

Les statistiques finales et le SHA signé sont relevés dans le retour de clôture.
