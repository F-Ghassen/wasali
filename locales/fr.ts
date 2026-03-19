export default {
  common: {
    back: 'Retour',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    save: 'Enregistrer',
    loading: 'Chargement…',
    seeAll: 'Voir tout',
    error: 'Une erreur est survenue. Veuillez réessayer.',
    continue: 'Continuer',
    edit: 'Modifier',
    discard: 'Ignorer',
  },
  lang: {
    en: 'English',
    fr: 'Français',
    selectLanguage: 'Choisir la langue',
  },

  // ── Shared profile strings (both roles) ─────────────────────────────────────
  profile: {
    language: 'Langue',
    notifications: 'Notifications',
    helpCenter: "Centre d'aide",
    termsPrivacy: 'CGU & Confidentialité',
    signOut: 'Se déconnecter',
    signOutError: 'Échec de la déconnexion. Veuillez réessayer.',
  },

  // ── Sender profile ───────────────────────────────────────────────────────────
  senderProfile: {
    account: 'Compte',
    support: 'Assistance',
    editProfile: 'Modifier le profil',
    savedAddresses: 'Adresses enregistrées',
  },

  // ── Driver profile ───────────────────────────────────────────────────────────
  driverProfile: {
    account: 'Compte',
    support: 'Assistance',
    editProfile: 'Modifier le profil',
    roleBadge: 'Voyageur',
    stats: {
      delivered: 'Livrés',
      earned: 'Gains',
      active: 'Actifs',
    },
  },

  // ── Driver tabs / layout ─────────────────────────────────────────────────────
  driverTabs: {
    dashboard: 'Tableau de bord',
    routes: 'Mes trajets',
    bookings: 'Réservations',
    profile: 'Profil',
  },
  roleGuard: {
    driverTitle: 'Espace conducteur',
    senderTitle: 'Espace expéditeur',
    driverOnly: 'Cette section est réservée aux conducteurs enregistrés. Votre compte est configuré en tant qu\'expéditeur.',
    senderOnly: 'Cette section est réservée aux expéditeurs. Votre compte est configuré en tant que conducteur.',
    goSender: "Aller à l'app expéditeur",
    goDriver: 'Aller au tableau de bord conducteur',
  },

  // ── Driver dashboard ─────────────────────────────────────────────────────────
  dashboard: {
    greeting: 'Bonjour, {{name}} 👋',
    subGreeting: 'Voici votre tableau de bord conducteur',
    upcomingTrips: 'Trajets à venir',
    pending: 'En attente',
    inTransit: 'En transit',
    pendingBookings: 'Réservations en attente',
    upcomingTripsSection: 'Trajets à venir',
    noPending: 'Aucune réservation en attente',
    noTrips: 'Aucun trajet à venir',
    createFirstRoute: 'Créer votre premier trajet',
  },

  // ── Driver routes list ───────────────────────────────────────────────────────
  driverRoutes: {
    title: 'Mes trajets',
    filters: {
      all: 'Tous',
      active: 'Actifs',
      completed: 'Terminés',
      cancelled: 'Annulés',
    },
    emptyAll: 'Aucun trajet',
    emptyFiltered: 'Aucun trajet {{filter}}',
    emptyDesc: 'Créez votre premier trajet pour commencer à accepter des colis.',
  },

  // ── Driver bookings list ─────────────────────────────────────────────────────
  driverBookings: {
    title: 'Réservations',
    filters: {
      all: 'Toutes',
      pending: 'En attente',
      confirmed: 'Confirmées',
      inTransit: 'En transit',
      delivered: 'Livrées',
    },
    emptyAll: 'Aucune réservation',
    emptyFiltered: 'Aucune réservation {{filter}}',
    emptyDesc: 'Les réservations sur vos trajets apparaîtront ici.',
  },

  // ── Driver route detail ──────────────────────────────────────────────────────
  routeDetail: {
    title: 'Détail du trajet',
    notFound: 'Trajet introuvable',
    labels: {
      departure: 'Départ',
      arrival: 'Arrivée est.',
      capacity: 'Capacité',
      pricePerKg: 'Prix/kg',
    },
    sections: {
      collectionStops: 'Points de collecte',
      dropoffStops: 'Points de livraison',
      performance: 'Performance est.',
      bookings: 'Réservations',
    },
    analytics: {
      expectedGross: 'Brut attendu',
      actualGross: 'Brut réel',
      fillRate: 'Taux de remplissage',
    },
    actions: {
      markFull: 'Marquer complet',
      cancel: 'Annuler le trajet',
    },
    alerts: {
      cannotCancel: 'Annulation impossible',
      cannotCancelMsg: 'Ce trajet a des réservations confirmées ou en transit. Veuillez les résoudre avant d\'annuler.',
      cancelTitle: 'Annuler le trajet',
      cancelMsg: 'Êtes-vous sûr de vouloir annuler ce trajet ? Cette action est irréversible.',
      markFullTitle: 'Marquer complet',
      markFullMsg: 'Aucune nouvelle réservation ne sera acceptée.',
    },
    toast: {
      markedFull: 'Trajet marqué comme complet',
      updateFailed: 'Échec de la mise à jour du trajet',
      cancelled: 'Trajet annulé',
      cancelFailed: "Échec de l'annulation du trajet",
    },
  },

  // ── Driver booking detail ────────────────────────────────────────────────────
  bookingDetail: {
    title: 'Détail de la réservation',
    notFound: 'Réservation introuvable',
    sections: {
      sender: 'Expéditeur',
      package: 'Colis',
      logistics: 'Logistique',
    },
    labels: {
      category: 'Catégorie',
      weight: 'Poids',
      declaredValue: 'Valeur déclarée',
      totalPrice: 'Prix total',
      pickup: 'Collecte',
      delivery: 'Livraison',
      pickupAddress: 'Adresse de collecte',
      deliveryAddress: 'Adresse de livraison',
      senderNotes: 'Notes de l\'expéditeur',
    },
    logisticsValues: {
      driverCollects: 'Le conducteur collecte',
      senderDropsOff: "L'expéditeur dépose",
      homeDelivery: 'Livraison à domicile',
      recipientPickup: 'Retrait par le destinataire',
    },
    actions: {
      confirm: 'Confirmer la réservation',
      reject: 'Refuser la réservation',
      scanQR: "Scanner le QR de l'expéditeur",
      markInTransit: 'Marquer en transit',
      markDelivered: 'Marquer comme livré',
    },
    alerts: {
      confirmTitle: 'Confirmer',
      confirmMsg: 'Accepter cette réservation et notifier l\'expéditeur ?',
      rejectTitle: 'Refuser',
      rejectMsg: 'Refuser cette réservation ? L\'expéditeur sera notifié.',
      inTransitTitle: 'Marquer en transit',
      inTransitMsg: 'Confirmez-vous avoir récupéré ce colis ?',
      deliveredTitle: 'Marquer comme livré',
      deliveredMsg: 'Confirmez-vous que ce colis a été livré ?',
    },
    toast: {
      inTransit: 'Colis marqué en transit',
      failed: 'Action échouée. Veuillez réessayer.',
      updateFailed: 'Échec de la mise à jour du statut',
    },
  },

  // ── Route creation wizard ────────────────────────────────────────────────────
  routeWizard: {
    navTitle: 'Nouveau trajet',
    draftBanner: 'Vous avez un brouillon de trajet non enregistré.',
    steps: {
      collect: 'Collecte',
      dropoff: 'Livraison',
      notes: 'Notes',
      services: 'Services',
      pricing: 'Tarification',
    },
    collection: {
      title: 'Points de collecte',
      cityLabel: 'Ville',
      cityPlaceholder: 'Sélectionner la ville de collecte',
      departureDateLabel: 'Date de départ (optionnel)',
      collectionDateLabel: 'Date de collecte (optionnel)',
      meetingPointLabel: 'Lien du point de rendez-vous (optionnel)',
      addStop: 'Ajouter un point de collecte',
      maxStops: 'Maximum 8 arrêts',
      stopNum: 'Arrêt {{num}}',
      error: 'Ajoutez au moins un point de collecte avec ville et pays',
    },
    dropoff: {
      title: 'Points de livraison',
      cityLabel: 'Ville',
      cityPlaceholder: 'Sélectionner la ville de livraison',
      arrivalLabel: 'Arrivée estimée (optionnel)',
      meetingPointLabel: 'Lien du point de rendez-vous (optionnel)',
      addStop: 'Ajouter un point de livraison',
      maxStops: 'Maximum 8 arrêts',
      stopNum: 'Arrêt {{num}}',
      error: 'Ajoutez au moins un point de livraison avec ville et pays',
    },
    logistics: {
      dropoffPoint: 'Dépôt au point de collecte',
      dropoffDesc: "L'expéditeur apporte les colis à un point de rendez-vous convenu avant le départ.",
      homePickup: 'Collecte à domicile par le conducteur',
      homePickupDesc: "Vous collectez le colis directement à l'adresse de l'expéditeur.",
      recipientCollects: 'Retrait par le destinataire',
      recipientCollectsDesc: 'Le destinataire récupère le colis à un point de livraison dans la ville de destination.',
      homeDelivery: 'Livraison à domicile par le conducteur',
      homeDeliveryDesc: 'Vous livrez le colis directement à la porte du destinataire.',
    },
    notes: {
      title: 'Notes & règles',
      senderNotesLabel: 'Notes pour les expéditeurs (optionnel)',
      placeholder: 'Informations supplémentaires pour les expéditeurs…',
      prohibitedItems: 'Articles interdits',
      addCustom: 'Ajouter un article personnalisé…',
    },
    services: {
      title: 'Services',
      collection: 'Collecte',
      delivery: 'Livraison',
      feeLabel: 'Vos frais par réservation',
      free: 'Gratuit',
      error: 'Activez au moins une option de collecte et une option de livraison',
    },
    pricing: {
      title: 'Tarification & paramètres',
      capacity: 'Capacité',
      basePrice: 'Prix de base',
      availableWeight: 'Poids disponible',
      minWeight: 'Poids min. par expéditeur',
      pricePerKg: 'Prix par kg',
      promo: 'Activer une promo',
      discount: 'Réduction (%)',
      expiresAt: 'Expire le',
      promoLabel: 'Libellé promo',
      paymentMethods: 'Moyens de paiement acceptés',
      saveTemplate: 'Enregistrer comme modèle',
      templateName: 'Nom du modèle',
      submit: 'Créer le trajet',
      submitting: 'Création…',
      errors: {
        fillPricing: 'Veuillez remplir tous les champs de tarification',
        duplicate: 'Trajet en double',
        duplicateMsg: 'Vous avez déjà un trajet sur ce corridor pour cette date.',
      },
      toast: {
        success: 'Trajet publié avec succès !',
        offline: 'Pas de connexion — trajet enregistré localement.',
        failed: 'Échec de la création du trajet. Veuillez réessayer.',
      },
    },
  },

  // ── Sender home ──────────────────────────────────────────────────────────────
  home: {
    heroTitle: 'Expédiez. Faites confiance. C\'est fait.',
    searchFrom: 'De (ville)',
    searchTo: 'Vers (ville)',
    searchBtn: 'Rechercher des trajets',
    featuredRoutes: 'TRAJETS EN VEDETTE',
    bookSlot: '📦  Réserver ce créneau →',
    routeFull: 'Trajet complet — cherchez des alternatives',
    showAllRoutes: 'Afficher tous les trajets',
    searching: 'Recherche…',
    searchDrivers: 'Rechercher des conducteurs →',
    selectCity: 'Sélectionner une ville',
    departBefore: 'Partir avant…',
    fromSelectCity: 'Départ — Sélectionner une ville',
    toSelectCity: 'Arrivée — Sélectionner une ville',
    departBeforeTitle: 'Partir avant',
    anyTime: "N'importe quand",
  },

  // ── Sender booking wizard ────────────────────────────────────────────────────
  booking: {
    steps: {
      details: 'Détails',
      logistics: 'Logistique',
      package: 'Colis',
      recipient: 'Destinataire',
      payment: 'Paiement',
    },
    senderMode: {
      own: 'J\'envoie pour moi-même',
      behalf: 'Au nom de quelqu\'un',
    },
    collection: {
      dropoff: 'Point de dépôt',
      dropoffDesc: 'Apportez à un point de collecte partagé. Adresse et heure exactes confirmées après réservation.',
      pickup: 'Collecte par le conducteur',
      pickupDesc: 'Le conducteur collecte à votre porte.',
    },
    delivery: {
      collect: 'Le destinataire collecte',
      collectDesc: 'Retrait au point partagé dans la ville de destination.',
      home: 'Livraison à domicile par le conducteur',
      homeDesc: "Le conducteur livre à la porte. Adresse du destinataire requise.",
    },
    packageTypes: {
      clothing: 'Vêtements',
      food: 'Alimentation',
      electronics: 'Électronique',
      documents: 'Documents',
      mixed: 'Mixte',
      other: 'Autre',
    },
    payment: {
      card: 'Carte bancaire',
      paypal: 'PayPal',
      cash: 'Espèces au conducteur',
    },
    confirmPay: 'Confirmer & payer →',
    reviewPay: 'Vérifier & payer →',
    escrow: 'Protection séquestre — Paiement libéré uniquement à la livraison confirmée',
    error: {
      title: 'Réservation échouée',
      fallback: 'Une erreur est survenue. Veuillez réessayer.',
    },
  },

  // ── Booking status (mirrors bookingStatus.ts) ────────────────────────────────
  status: {
    pending: { label: 'En attente du conducteur', desc: 'En attente de la confirmation du conducteur' },
    confirmed: { label: 'Confirmée', desc: 'Votre réservation est confirmée et planifiée' },
    in_transit: { label: 'En transit', desc: 'Votre colis est en route' },
    delivered: { label: 'Livré', desc: 'Le colis a été livré' },
    disputed: { label: 'Litige', desc: 'Un litige a été ouvert' },
    cancelled: { label: 'Annulée', desc: 'Cette réservation a été annulée' },
  },

  // ── Tracking screen ──────────────────────────────────────────────────────────
  tracking: {
    title: "Suivi de l'envoi",
    pendingBanner: 'En attente de confirmation du conducteur — vous serez notifié une fois que le conducteur accepte.',
    steps: {
      confirmed: 'Réservation confirmée',
      in_transit: 'Colis collecté & en transit',
      delivered: 'Livré',
      rated: 'Séquestre libéré',
    },
    escrowNote: 'Paiement en séquestre — libéré uniquement à la livraison confirmée',
    rateTitle: 'Tout est bien arrivé ?',
    rateBtn: 'Évaluer le conducteur',
    printLabel: "Imprimer l'étiquette d'expédition",
    myBookings: 'Mes réservations',
    insufficientCapacity: 'Capacité insuffisante sur ce trajet. Réservation renvoyée en attente.',
    shipmentProgress: "Progression de l'envoi",
    departure: 'Départ',
    estArrival: 'Arrivée est.',
    weight: 'Poids',
  },
} as const;
