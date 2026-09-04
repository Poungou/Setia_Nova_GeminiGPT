-- Reprend les rubriques publiques existantes de Poungou dans le profil joueur.
INSERT INTO user_profiles (user_id, avatar, image_source, player_intro, writing_style, univers, tw, rhythm, ig_username, profile_public, created_at, updated_at)
SELECT u.id,
  '/media/portrait-poungou2-mtlqifxe.png',
  '',
  'Quelques règles en bref :',
  'J’écris principalement avec un narrateur, mais je peux également jouer à la première personne si nous en convenons ensemble. Le principal reste de s’amuser. La narration sert uniquement à donner davantage de matière au RP et de profondeur aux personnages. Votre personnage ne connaît donc pas automatiquement ce qui est expliqué dans la narration. Cela vaut notamment pour les flashbacks : certaines scènes ne pourront jamais être vécues directement par les deux protagonistes, mais permettent de mieux comprendre un personnage et son histoire. Vous pouvez évidemment utiliser ce principe également, avec modération. L’orthographe et moi, c’est une grande histoire d’amour contrariée. Je m’aide de différents outils pour corriger mes textes, mais quelques fautes peuvent malgré tout passer à travers. Je m’en excuse d’avance. Concernant votre écriture : tant que cela reste lisible, ça me va très bien.',
  'J’ai pas mal de personnages, notamment la lignée des Nakamura, qui possèdent un background surnaturel qu’il m’est parfois difficile d’adapter à un RP totalement classique. Néanmoins, si votre personnage ne possède aucun don particulier, je m’adapte également. Je peux très bien passer d’une chute d’une falaise avec quelques égratignures à une chute entraînant de véritables conséquences sur mon personnage. Exception : Kazuko et Hachiro Nakamura restent des personnages profondément liés au fantastique.',
  'Je n’ai pas de Trigger Warning particulier. En revanche, si vous souhaitez pousser fortement certains sujets traumatiques ou sensibles, une petite discussion avant le RP est préférable afin que nous soyons sur la même longueur d’onde.',
  'J’essaie de répondre au minimum une fois par semaine. Mon rythme peut cependant beaucoup varier : je peux répondre trois ou quatre fois dans une même journée selon le mood, comme parfois mettre deux semaines à répondre. Dans ce dernier cas, j’essaie toujours de prévenir.',
  '',
  1,
  datetime('now'), datetime('now')
FROM users u
WHERE lower(u.name) = 'poungou'
  AND NOT EXISTS (SELECT 1 FROM user_profiles p WHERE p.user_id = u.id);
PRAGMA optimize;
