export default {
  common: {
    back: "Back",
    cancel: "Cancel",
    confirm: "Confirm",
    save: "Save",
    loading: "Loading…",
    seeAll: "See all",
    error: "Something went wrong. Please try again.",
    continue: "Continue",
    edit: "Edit",
    discard: "Discard",
  },
  lang: {
    en: "English",
    fr: "Français",
    selectLanguage: "Select Language",
  },

  // ── Shared profile strings (both roles) ─────────────────────────────────────
  profile: {
    language: "Language",
    notifications: "Notifications",
    helpCenter: "Help Center",
    termsPrivacy: "Terms & Privacy",
    signOut: "Sign Out",
    signOutError: "Failed to sign out. Please try again.",
  },

  // ── Sender profile ───────────────────────────────────────────────────────────
  senderProfile: {
    account: "Account",
    support: "Support",
    editProfile: "Edit Profile",
    savedAddresses: "Saved Addresses",
  },

  // ── Driver profile ───────────────────────────────────────────────────────────
  driverProfile: {
    account: "Account",
    support: "Support",
    editProfile: "Edit Profile",
    roleBadge: "Traveller",
    stats: {
      delivered: "Delivered",
      earned: "Earned",
      active: "Active",
    },
  },

  // ── Driver tabs / layout ─────────────────────────────────────────────────────
  driverTabs: {
    dashboard: "Dashboard",
    routes: "My Routes",
    bookings: "Bookings",
    profile: "Profile",
  },
  roleGuard: {
    driverTitle: "Driver Area",
    senderTitle: "Sender Area",
    driverOnly:
      "This section is for registered drivers only. Your account is set up as a sender.",
    senderOnly:
      "This section is for senders. Your account is set up as a driver.",
    goSender: "Go to Sender App",
    goDriver: "Go to Driver Dashboard",
  },

  // ── Driver dashboard ─────────────────────────────────────────────────────────
  dashboard: {
    greeting: "Hello, {{name}} 👋",
    subGreeting: "Here's your driver overview",
    upcomingTrips: "Upcoming Trips",
    pending: "Pending",
    inTransit: "In Transit",
    pendingBookings: "Pending Bookings",
    upcomingTripsSection: "Upcoming Trips",
    noPending: "No pending bookings",
    noTrips: "No upcoming trips",
    createFirstRoute: "Create your first route",
  },

  // ── Driver routes list ───────────────────────────────────────────────────────
  driverRoutes: {
    title: "My Routes",
    filters: {
      all: "All",
      active: "Active",
      completed: "Completed",
      cancelled: "Cancelled",
    },
    emptyAll: "No routes yet",
    emptyFiltered: "No {{filter}} routes",
    emptyDesc: "Create your first route to start accepting packages.",
  },

  // ── Driver bookings list ─────────────────────────────────────────────────────
  driverBookings: {
    title: "Bookings",
    filters: {
      all: "All",
      pending: "Pending",
      confirmed: "Confirmed",
      inTransit: "In Transit",
      delivered: "Delivered",
    },
    emptyAll: "No bookings yet",
    emptyFiltered: "No {{filter}} bookings",
    emptyDesc: "Bookings on your routes will appear here.",
  },

  // ── Driver route detail ──────────────────────────────────────────────────────
  routeDetail: {
    title: "Route Detail",
    notFound: "Route not found",
    labels: {
      departure: "Departure",
      arrival: "Est. Arrival",
      capacity: "Capacity",
      pricePerKg: "Price/kg",
    },
    sections: {
      collectionStops: "Collection Stops",
      dropoffStops: "Drop-off Stops",
      performance: "Est. Performance",
      bookings: "Bookings",
    },
    analytics: {
      expectedGross: "Expected gross",
      actualGross: "Actual gross",
      fillRate: "Fill rate",
    },
    actions: {
      markFull: "Mark as Full",
      cancel: "Cancel Route",
    },
    alerts: {
      cannotCancel: "Cannot Cancel",
      cannotCancelMsg:
        "This route has confirmed or in-transit bookings. Please resolve them before cancelling.",
      cancelTitle: "Cancel Route",
      cancelMsg:
        "Are you sure you want to cancel this route? This cannot be undone.",
      markFullTitle: "Mark as Full",
      markFullMsg: "No new bookings will be accepted.",
    },
    toast: {
      markedFull: "Route marked as full",
      updateFailed: "Failed to update route",
      cancelled: "Route cancelled",
      cancelFailed: "Failed to cancel route",
    },
  },

  // ── Driver booking detail ────────────────────────────────────────────────────
  bookingDetail: {
    title: "Booking Detail",
    notFound: "Booking not found",
    sections: {
      sender: "Sender",
      package: "Package",
      logistics: "Logistics",
    },
    labels: {
      category: "Category",
      weight: "Weight",
      declaredValue: "Declared Value",
      totalPrice: "Total Price",
      pickup: "Pickup",
      delivery: "Delivery",
      pickupAddress: "Pickup address",
      deliveryAddress: "Delivery address",
      senderNotes: "Sender notes",
    },
    logisticsValues: {
      driverCollects: "Driver collects",
      senderDropsOff: "Sender drops off",
      homeDelivery: "Home delivery",
      recipientPickup: "Recipient pickup",
    },
    actions: {
      confirm: "Confirm Booking",
      reject: "Reject Booking",
      scanQR: "Scan Sender's QR",
      markInTransit: "Mark as In Transit",
      markDelivered: "Mark as Delivered",
    },
    alerts: {
      confirmTitle: "Confirm",
      confirmMsg: "Accept this booking and notify the sender?",
      rejectTitle: "Reject",
      rejectMsg: "Reject this booking? The sender will be notified.",
      inTransitTitle: "Mark In Transit",
      inTransitMsg: "Confirm you have picked up this package?",
      deliveredTitle: "Mark Delivered",
      deliveredMsg: "Confirm this package has been delivered?",
    },
    toast: {
      inTransit: "Package marked as in transit",
      failed: "Action failed. Please try again.",
      updateFailed: "Failed to update status",
    },
  },

  // ── Route creation wizard ────────────────────────────────────────────────────
  routeWizard: {
    navTitle: "New Route",
    draftBanner: "You have an unsaved route draft.",
    steps: {
      collect: "Collect",
      dropoff: "Drop-off",
      notes: "Notes",
      services: "Services",
      pricing: "Pricing",
    },
    collection: {
      title: "Collection Stops",
      cityLabel: "City",
      cityPlaceholder: "Select collection city",
      departureDateLabel: "Departure date",
      collectionDateLabel: "Collection date (optional)",
      meetingPointLabel: "Meeting point link (optional)",
      addStop: "Add collection stop",
      maxStops: "Maximum 8 stops",
      stopNum: "Stop {{num}}",
      error: "Add at least one collection stop with city and country",
    },
    dropoff: {
      title: "Drop-off Stops",
      cityLabel: "City",
      cityPlaceholder: "Select drop-off city",
      arrivalLabel: "Estimated arrival",
      meetingPointLabel: "Meeting point link (optional)",
      addStop: "Add drop-off stop",
      maxStops: "Maximum 8 stops",
      stopNum: "Stop {{num}}",
      error: "Add at least one drop-off stop with city and country",
    },
    logistics: {
      dropoffPoint: "Drop-off at collection point",
      dropoffDesc:
        "Sender brings packages to an agreed meeting point before departure.",
      homePickup: "Home pick-up by driver",
      homePickupDesc:
        "You collect the package directly from the sender's address.",
      recipientCollects: "Recipient collects",
      recipientCollectsDesc:
        "Recipient picks up from a drop-off point in the destination city.",
      homeDelivery: "Home delivery by driver",
      homeDeliveryDesc:
        "You deliver the package directly to the recipient's door.",
    },
    notes: {
      title: "Notes & Rules",
      senderNotesLabel: "Notes for senders (optional)",
      placeholder: "Any additional info for senders…",
      prohibitedItems: "Prohibited items",
      addCustom: "Add custom item…",
    },
    services: {
      title: "Services",
      collection: "Collection",
      delivery: "Delivery",
      feeLabel: "Your fee per booking",
      free: "Free",
      error: "Enable at least one collection and one delivery option",
    },
    pricing: {
      title: "Pricing & Settings",
      capacity: "Capacity",
      basePrice: "Base Price",
      availableWeight: "Available weight",
      minWeight: "Min weight per sender",
      pricePerKg: "Price per kg",
      promo: "Enable promo",
      discount: "Discount (%)",
      expiresAt: "Expires at",
      promoLabel: "Promo label",
      paymentMethods: "Payment methods accepted",
      saveTemplate: "Save as template",
      templateName: "Template name",
      submit: "Create Route",
      submitting: "Creating…",
      errors: {
        fillPricing: "Please fill in all pricing fields",
        duplicate: "Duplicate Route",
        duplicateMsg:
          "You already have a route on this corridor for this date.",
      },
      toast: {
        success: "Route published successfully!",
        offline: "No connection — route saved locally.",
        failed: "Failed to create route. Please try again.",
      },
    },
  },

  // ── Sender home ──────────────────────────────────────────────────────────────
  home: {
    heroTitle: "Ship it. Trust it. Done.",
    hero: {
      headline:
        "📦 Send packages to Tunisia from Europe.\n📮 Or receive from family abroad.",
      subheadline:
        "💰 Cheaper than couriers  •  ⚡ Faster than mail  •  ⭐ Trustworthy drivers",
      driverCTA: "Are you a driver? Earn money",
      findRoutes: "Find available routes",
    },
    howItWorks: {
      title: "How it works",
      subtitle:
        "Three simple steps to ship packages safely across Europe and Tunisia",
      steps: [
        {
          title: "Search available routes",
          description:
            "Find drivers heading your way. Filter by city, date, and price.",
        },
        {
          title: "Book your package",
          description:
            "Choose pickup & delivery options. Add your package details and pay securely.",
        },
        {
          title: "Track & receive",
          description:
            "Get real-time updates. Your package arrives safely with trusted drivers.",
        },
      ],
    },
    whereFrom: {
      title: "Where are your packages coming from?",
      subtitle:
        "Choose your departure country to find available shipping routes",
      seeAll: "See all available routes →",
    },
    searchFrom: "From (city)",
    searchTo: "To (city)",
    searchBtn: "Search routes",
    featuredRoutes: "FEATURED ROUTES",
    bookSlot: "📦  Book this slot →",
    routeFull: "Route full — search for alternatives",
    showAllRoutes: "Show all routes",
    searching: "Searching…",
    searchDrivers: "Search drivers →",
    selectCity: "Select city",
    departBefore: "Depart before…",
    fromSelectCity: "From — Select City",
    toSelectCity: "To — Select City",
    departBeforeTitle: "Depart before",
    anyTime: "Any time",
  },

  // ── Sender booking wizard ────────────────────────────────────────────────────
  booking: {
    steps: {
      details: "Details",
      logistics: "Logistics",
      package: "Package",
      recipient: "Recipient",
      payment: "Payment",
    },
    senderMode: {
      own: "Sending for myself",
      behalf: "On behalf of someone",
    },
    collection: {
      dropoff: "Drop-off point",
      dropoffDesc:
        "Bring to a shared collection point. Exact address & time confirmed after booking.",
      pickup: "Driver picks up",
      pickupDesc: "Driver collects from your door.",
    },
    delivery: {
      collect: "Recipient collects",
      collectDesc: "Pick up from shared point in drop-off city.",
      home: "Home delivery by driver",
      homeDesc: "Driver delivers to the door. Recipient address required.",
    },
    packageTypes: {
      clothing: "Clothing",
      food: "Food",
      electronics: "Electronics",
      documents: "Documents",
      mixed: "Mixed",
      other: "Other",
    },
    payment: {
      card: "Credit / Debit card",
      paypal: "PayPal",
      cash: "Cash to driver",
    },
    confirmPay: "Confirm & pay →",
    reviewPay: "Review & pay →",
    escrow: "Escrow protection — Payment released only on confirmed delivery",
    error: {
      title: "Booking failed",
      fallback: "Something went wrong. Please try again.",
    },
  },

  // ── Booking status (mirrors bookingStatus.ts) ────────────────────────────────
  status: {
    pending: {
      label: "Awaiting Driver",
      desc: "Waiting for the driver to confirm your booking",
    },
    confirmed: {
      label: "Confirmed",
      desc: "Your booking is confirmed and scheduled",
    },
    in_transit: { label: "In Transit", desc: "Your package is on its way" },
    delivered: { label: "Delivered", desc: "Package has been delivered" },
    disputed: { label: "Disputed", desc: "A dispute has been raised" },
    cancelled: { label: "Cancelled", desc: "This booking was cancelled" },
  },

  // ── Tracking screen ──────────────────────────────────────────────────────────
  tracking: {
    title: "Shipment tracking",
    pendingBanner:
      "Awaiting driver confirmation — you'll be notified once the driver accepts.",
    steps: {
      confirmed: "Booking confirmed",
      in_transit: "Package collected & in transit",
      delivered: "Delivered",
      rated: "Escrow released",
    },
    escrowNote: "Payment held in escrow — released only on confirmed delivery",
    rateTitle: "Everything arrived safely?",
    rateBtn: "Rate your driver",
    printLabel: "Print shipment label",
    myBookings: "My bookings",
    insufficientCapacity:
      "Not enough capacity on this route. Booking reverted to pending.",
    shipmentProgress: "Shipment progress",
    departure: "Departure",
    estArrival: "Est. arrival",
    weight: "Weight",
  },
} as const;
