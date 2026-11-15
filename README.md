# Espace LIMAGECILS

Le lien existant `https://emmacaulinech-lab.github.io/limagecils-facturation/` devient un accueil avec trois entrées :

- **Facturation Franchise** : `facturation-reseau.html`, l'ancien outil du dépôt.
- **Facturation clientes** : `ma-facturation.html`, export de `emma/facturation/index.html`.
- **Formations** : `formations.html`, interface et logique du module EMMA extraites dans des fichiers dédiés.

Aucune page ne charge EMMA OS dans une iframe. L'accueil propose seulement un lien pour revenir à l'espace personnel. Les pages de facturation gardent leur code métier et leur configuration Firebase ; seules leurs titres et un lien de retour ont été ajoutés. Le stockage navigateur reste sur la même origine GitHub Pages.

## Données Formations

Connexion avec le compte EMMA existant, sur le même projet Firebase. Lecture du document `users/{uid}/modules/formations`, puis de l'ancien champ `users/{uid}/data/main.formations` seulement si le document principal n'existe pas. Un document principal corrompu bloque le chargement sans repli silencieux.

Les sauvegardes n'écrivent que le document formations, dans une transaction vérifiant qu'il n'a pas changé depuis la lecture. Une autre fenêtre qui a modifié le dossier bloque l'écrasement et demande de recharger. La copie ancienne n'est jamais supprimée. Les autres données personnelles ne sont ni chargées ni écrites. L'export local des formations reste disponible.

Le planning personnel continue à être calculé par EMMA, qui lit ces mêmes dossiers. Le module LIMAGECILS ne modifie pas le Journal. Le correctif coordonné dans le dépôt EMMA supprime la réécriture globale des formations dans `saveAll` et remplace les validations d'étapes depuis le Journal par une transaction ciblée sur la dernière version.

Les modèles PDF utilisent pour le moment leurs URL actuelles sous `/emma/documents/`, avec les contrôles d'intégrité existants. Les images de kits gardent aussi leurs URL actuelles. Ne pas supprimer ces ressources du dépôt EMMA. Aucune migration de contenu n'est requise pour le lancement.

## Validation

`node tests/standalone.cjs` : syntaxe, rubriques, liens, invariance des scripts de facturation, onglets formations, lecture principale/ancienne, blocage de corruption, transaction isolée, protection contre un dossier concurrent et changement de compte. Les tests utilisent uniquement des données fictives et ne se connectent pas à Firebase.

Les scripts des quatre pages HTML ont également été parsés. La prévisualisation HTTP locale est interdite dans l'environnement de modification ; les parcours visuels authentifiés et la génération réelle des PDF restent à vérifier avant mise en ligne. Déployer les correctifs coordonnés d'EMMA pour éviter qu'une ancienne version de sa sauvegarde globale ne réécrive les formations ; fermer les anciennes fenêtres avant utilisation.

## Connexion à l'espace LIMAGECILS

`access-gate.js` masque l'accueil et les trois pages métier jusqu'à confirmation d'une session Firebase EMMA. `access.html` isole le SDK de connexion pour éviter tout conflit avec les deux outils de facturation. La session EMMA habituelle est réutilisée ; le bouton Déconnexion ferme l'accès à toutes les rubriques. Les messages de session ne sont acceptés que depuis la fenêtre de connexion et la même origine. Aucun mot de passe n'est sauvegardé par le code ajouté ni transmis par message entre fenêtres.

Ce contrôle est un écran d'accès côté navigateur. GitHub Pages reste un hébergement statique public ; la protection des données repose sur les authentifications et règles Firebase existantes, qui ne sont pas modifiées. `node tests/access.cjs` vérifie les accès directs, le blocage initial, le filtrage des messages, la connexion, le refus et la déconnexion.
