import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Switch,
  TextInput,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Check,
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Info,
  Lock,
  X,
} from "lucide-react-native";
import { format } from "date-fns";
import { Colors } from "@/constants/colors";
import { BorderRadius, Spacing } from "@/constants/spacing";
import { FontSize } from "@/constants/typography";
import { Button } from "@/components/ui/Button";
import { DateInput } from "@/components/ui/DateInput";
import { URLInput } from "@/components/ui/URLInput";
import { CityPickerInput } from "@/components/ui/CityPickerInput";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { useDriverRouteStore } from "@/stores/driverRouteStore";
import { useUIStore } from "@/stores/uiStore";
import { useCitiesStore } from "@/stores/citiesStore";
import { supabase } from "@/lib/supabase";
import { RouteSummaryCard } from "@/components/driver/RouteSummaryCard";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CollectionStop {
  city_id: string;
  collection_date: string;
  location_name: string;
  meeting_point_url: string;
}

interface DropoffStop {
  city_id: string;
  estimated_arrival_date: string;
  location_name: string;
  meeting_point_url: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { num: 1, key: "collection", tKey: "routeWizard.steps.collect" as const },
  { num: 2, key: "dropoff", tKey: "routeWizard.steps.dropoff" as const },
  { num: 3, key: "notes", tKey: "routeWizard.steps.notes" as const },
  { num: 4, key: "services", tKey: "routeWizard.steps.services" as const },
  { num: 5, key: "pricing", tKey: "routeWizard.steps.pricing" as const },
];

const PAYMENT_METHODS = [
  "cash_sender",
  "cash_recipient",
  "paypal",
  "bank_transfer",
];
const PAYMENT_LABELS: Record<string, string> = {
  cash_sender: "Cash (sender pays on collection)",
  cash_recipient: "Cash (recipient pays on delivery)",
  paypal: "PayPal",
  bank_transfer: "Bank transfer",
};

// Maps old logistics_options keys → route_services service_type
const COLL_KEY_TO_SERVICE_TYPE: Record<
  string,
  "sender_dropoff" | "driver_pickup"
> = {
  drop_off: "sender_dropoff",
  home_pickup: "driver_pickup",
};
const DELV_KEY_TO_SERVICE_TYPE: Record<
  string,
  "recipient_collects" | "driver_delivery" | "local_post"
> = {
  recipient_collect: "recipient_collects",
  home_delivery: "driver_delivery",
};

const DRAFT_KEY_PREFIX = "wasali:route:wizard:draft:";
const QUEUE_KEY = "wasali:route:queue";
const DRAFT_TTL_MS = 48 * 3600 * 1000;

// ─── Logistics constants ───────────────────────────────────────────────────────

interface LogisticsOpt {
  key: string;
  enabled: boolean;
  price: string;
}

const COLLECTION_LOGISTICS_KEYS: {
  key: string;
  labelKey: string;
  descKey: string;
  free?: boolean;
}[] = [
  {
    key: "drop_off",
    labelKey: "routeWizard.logistics.dropoffPoint",
    descKey: "routeWizard.logistics.dropoffDesc",
    free: true,
  },
  {
    key: "home_pickup",
    labelKey: "routeWizard.logistics.homePickup",
    descKey: "routeWizard.logistics.homePickupDesc",
  },
];

const DELIVERY_LOGISTICS_KEYS: {
  key: string;
  labelKey: string;
  descKey: string;
  free?: boolean;
}[] = [
  {
    key: "recipient_collect",
    labelKey: "routeWizard.logistics.recipientCollects",
    descKey: "routeWizard.logistics.recipientCollectsDesc",
    free: true,
  },
  {
    key: "home_delivery",
    labelKey: "routeWizard.logistics.homeDelivery",
    descKey: "routeWizard.logistics.homeDeliveryDesc",
  },
];

const COLLECTION_DEFAULTS: LogisticsOpt[] = [
  { key: "drop_off", enabled: true, price: "0" },
  { key: "home_pickup", enabled: false, price: "8" },
];

const DELIVERY_DEFAULTS: LogisticsOpt[] = [
  { key: "recipient_collect", enabled: true, price: "0" },
  { key: "home_delivery", enabled: false, price: "10" },
];

const OIL_LIMIT_LITERS = 2;

const PROHIBITED_PRESETS = [
  "Weapons",
  "Drugs",
  "Explosives",
  "Live animals",
  "Perishable food",
  "Flammable liquids",
  "Cash & banknotes",
  "Counterfeit goods",
  `Oil > ${OIL_LIMIT_LITERS}L (metal container only)`,
  "Cigarettes & shisha",
  "Alcohol",
  "Medication",
  "Electronics > €500",
];

// ─── StepIndicator ────────────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: number }) {
  const { t } = useTranslation();
  return (
    <View style={si.root}>
      {STEPS.map((step, i) => {
        const done = currentStep > step.num;
        const active = currentStep === step.num;
        return (
          <React.Fragment key={step.key}>
            <View style={si.item}>
              <View
                style={[si.dot, done && si.dotDone, active && si.dotActive]}
              >
                {done ? (
                  <Check size={10} color={Colors.white} strokeWidth={3} />
                ) : (
                  <Text
                    style={[si.dotNum, (active || done) && si.dotNumActive]}
                  >
                    {step.num}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  si.label,
                  active && si.labelActive,
                  done && si.labelDone,
                ]}
                numberOfLines={1}
              >
                {t(step.tKey)}
              </Text>
            </View>
            {i < STEPS.length - 1 && (
              <View style={[si.line, done && si.lineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─── StepCard ─────────────────────────────────────────────────────────────────

function StepCard({
  stepNum,
  title,
  isActive,
  isCompleted,
  isLocked,
  summary,
  onEdit,
  children,
}: {
  stepNum: number;
  title: string;
  isActive: boolean;
  isCompleted: boolean;
  isLocked: boolean;
  summary?: string;
  onEdit?: () => void;
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <View style={[sc.card, isLocked && sc.cardLocked]}>
      <View style={sc.header}>
        <View
          style={[
            sc.badge,
            isCompleted && sc.badgeDone,
            isActive && sc.badgeActive,
          ]}
        >
          {isCompleted ? (
            <Check size={11} color={Colors.white} strokeWidth={3} />
          ) : isLocked ? (
            <Lock size={10} color={Colors.text.tertiary} />
          ) : (
            <Text style={[sc.badgeNum, isActive && sc.badgeNumActive]}>
              {stepNum}
            </Text>
          )}
        </View>
        <Text style={[sc.title, isLocked && sc.titleLocked]}>{title}</Text>
        {isCompleted && !isActive && onEdit && (
          <TouchableOpacity
            onPress={onEdit}
            style={sc.editBtn}
            activeOpacity={0.7}
          >
            <Text style={sc.editText}>{t("common.edit")}</Text>
          </TouchableOpacity>
        )}
      </View>

      {isCompleted && !isActive && summary ? (
        <Text style={sc.summary} numberOfLines={2}>
          {summary}
        </Text>
      ) : null}

      {isActive ? <View style={sc.body}>{children}</View> : null}
    </View>
  );
}

// ─── LogisticsOptionCard ──────────────────────────────────────────────────────

function LogisticsOptionCard({
  label,
  desc,
  free,
  enabled,
  price,
  onToggle,
  onChangePrice,
}: {
  label: string;
  desc: string;
  free?: boolean;
  enabled: boolean;
  price: string;
  onToggle: () => void;
  onChangePrice: (v: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={[lg.card, enabled && lg.cardActive]}>
      <TouchableOpacity style={lg.row} onPress={onToggle} activeOpacity={0.75}>
        <View style={[lg.check, enabled && lg.checkActive]}>
          {enabled && <Check size={10} color={Colors.white} strokeWidth={3} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[lg.label, !enabled && lg.labelMuted]}>{label}</Text>
          <Text style={lg.desc}>{desc}</Text>
        </View>
        {free && enabled && (
          <View style={lg.freeBadge}>
            <Text style={lg.freeBadgeText}>
              {t("routeWizard.services.free")}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      {enabled && !free && (
        <View style={lg.priceRow}>
          <Text style={lg.priceLabel}>
            {t("routeWizard.services.feeLabel")}
          </Text>
          <View style={lg.priceInputWrap}>
            <Text style={lg.priceSymbol}>€</Text>
            <TextInput
              style={lg.priceInput}
              value={price}
              onChangeText={onChangePrice}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={Colors.text.tertiary}
            />
          </View>
        </View>
      )}
    </View>
  );
}

// ─── NewRouteScreen ───────────────────────────────────────────────────────────

export default function NewRouteScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const { createRoute, publishRoute, fetchRoutes, routes } =
    useDriverRouteStore();
  const { showToast } = useUIStore();
  const { cities, isLoading: citiesLoading, fetchCities } = useCitiesStore();

  // Ensure cities are loaded — safety net if layout effect hasn't fired yet
  useEffect(() => {
    fetchCities();
  }, []);

  // Local submit state — decoupled from store's shared isLoading so that
  // background fetchRoutes calls don't disable the submit button.
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentStep, setCurrentStep] = useState(1);
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  // Filter cities by region
  const euCities = useMemo(
    () => cities.filter((c) => c.country !== "Tunisia"),
    [cities],
  );

  const tnCities = useMemo(
    () => cities.filter((c) => c.country === "Tunisia"),
    [cities],
  );

  // Collection stops: show all cities
  const collectionCities = useMemo(() => cities, [cities]);

  // Helper to get city name by ID
  const getCityName = useCallback(
    (cityId: string) => {
      return cities.find((c) => c.id === cityId)?.name ?? "";
    },
    [cities],
  );

  // Helper to get country by city ID
  const getCountry = useCallback(
    (cityId: string) => {
      return cities.find((c) => c.id === cityId)?.country ?? "";
    },
    [cities],
  );

  const emptyCollStop = (): CollectionStop => ({
    city_id: "",
    collection_date: "",
    location_name: "",
    meeting_point_url: "",
  });
  const emptyDropStop = (): DropoffStop => ({
    city_id: "",
    estimated_arrival_date: "",
    location_name: "",
    meeting_point_url: "",
  });

  // ── Step 1: Collection stops ───────────────────────────────────────────────
  const [collectionStops, setCollectionStops] = useState<CollectionStop[]>([
    emptyCollStop(),
  ]);

  // ── Step 2: Drop-off stops ─────────────────────────────────────────────────
  const [dropoffStops, setDropoffStops] = useState<DropoffStop[]>([
    emptyDropStop(),
  ]);

  // Dropoff stops: dynamic filtering based on collection selection
  const dropoffCities = useMemo(() => {
    // Get all countries selected in collection stops
    const selectedCountries = new Set(
      collectionStops
        .filter((s) => s.city_id)
        .map((stop) => {
          const city = cities.find((c) => c.id === stop.city_id);
          return city?.country;
        })
        .filter(Boolean),
    );

    if (selectedCountries.size === 0) {
      // No collection stops selected yet - show all cities
      return cities;
    }

    // Check if any selected countries are Tunisia
    const hasTunisia = selectedCountries.has("Tunisia");
    const hasEU = Array.from(selectedCountries).some((c) => c !== "Tunisia");

    // If only Tunisia selected in collection → show only EU in dropoff
    if (hasTunisia && !hasEU) {
      return euCities;
    }

    // If only EU selected in collection → show only Tunisia in dropoff
    if (hasEU && !hasTunisia) {
      return tnCities;
    }

    // Mixed selection - show all (shouldn't happen in normal flow)
    return cities;
  }, [cities, euCities, tnCities, collectionStops]);

  // ── Step 3: Notes & Rules ──────────────────────────────────────────────────
  const [notes, setNotes] = useState("");
  const [prohibitedItems, setProhibitedItems] = useState<string[]>([]);
  const [customItemInput, setCustomItemInput] = useState("");

  // ── Step 5: Pricing ────────────────────────────────────────────────────────
  const [weightKg, setWeightKg] = useState("100");
  const [minWeightKg, setMinWeightKg] = useState("10");
  const [pricePerKg, setPricePerKg] = useState("5");
  const [promoEnabled, setPromoEnabled] = useState(false);
  const [promoDiscountPct, setPromoDiscountPct] = useState("");
  const [promoExpiresAt, setPromoExpiresAt] = useState("");
  const [promoLabel, setPromoLabel] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<string[]>([
    "cash_sender",
    "cash_recipient",
    "paypal",
    "bank_transfer",
  ]);
  const [saveAsTemplate, setSaveAsTemplate] = useState(true);
  const [templateName, setTemplateName] = useState("");

  // ── Step 4: Logistics services ─────────────────────────────────────────────
  const [collectionOptions, setCollectionOptions] =
    useState<LogisticsOpt[]>(COLLECTION_DEFAULTS);
  const [deliveryOptions, setDeliveryOptions] =
    useState<LogisticsOpt[]>(DELIVERY_DEFAULTS);

  // ── Step 5: Vehicle & package limits ───────────────────────────────────────
  const [vehicleType, setVehicleType] = useState<string>("");
  const [maxSinglePackageKg, setMaxSinglePackageKg] = useState("");

  // ── Draft recovery ─────────────────────────────────────────────────────────
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const pendingDraftRef = useRef<any>(null);
  const draftKey = profile ? `${DRAFT_KEY_PREFIX}${profile.id}` : null;
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!draftKey) return;
    AsyncStorage.getItem(draftKey).then((raw) => {
      if (!raw) return;
      try {
        const draft = JSON.parse(raw);
        if (Date.now() - draft.savedAt < DRAFT_TTL_MS) {
          pendingDraftRef.current = draft;
          setShowDraftBanner(true);
        }
      } catch {
        /* ignore */
      }
    });
  }, [draftKey]);

  const saveDraft = useCallback(() => {
    if (!draftKey) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      AsyncStorage.setItem(
        draftKey,
        JSON.stringify({
          collectionStops,
          dropoffStops,
          notes,
          prohibitedItems,
          weightKg,
          minWeightKg,
          pricePerKg,
          promoEnabled,
          promoDiscountPct,
          promoExpiresAt,
          promoLabel,
          paymentMethods,
          saveAsTemplate,
          templateName,
          collectionOptions,
          deliveryOptions,
          vehicleType,
          maxSinglePackageKg,
          currentStep,
          savedAt: Date.now(),
        }),
      );
    }, 500);
  }, [
    draftKey,
    collectionStops,
    dropoffStops,
    notes,
    prohibitedItems,
    weightKg,
    minWeightKg,
    pricePerKg,
    promoEnabled,
    promoDiscountPct,
    promoExpiresAt,
    promoLabel,
    paymentMethods,
    saveAsTemplate,
    templateName,
    collectionOptions,
    deliveryOptions,
    vehicleType,
    maxSinglePackageKg,
    currentStep,
  ]);

  useEffect(() => {
    saveDraft();
  }, [saveDraft]);

  const restoreDraft = () => {
    const d = pendingDraftRef.current;
    if (!d) return;
    if (d.collectionStops) setCollectionStops(d.collectionStops);
    if (d.dropoffStops) setDropoffStops(d.dropoffStops);
    if (d.notes) setNotes(d.notes);
    if (d.prohibitedItems) setProhibitedItems(d.prohibitedItems);
    if (d.weightKg) setWeightKg(d.weightKg);
    if (d.minWeightKg) setMinWeightKg(d.minWeightKg);
    if (d.pricePerKg) setPricePerKg(d.pricePerKg);
    if (d.promoEnabled != null) setPromoEnabled(d.promoEnabled);
    if (d.promoDiscountPct) setPromoDiscountPct(d.promoDiscountPct);
    if (d.promoExpiresAt) setPromoExpiresAt(d.promoExpiresAt);
    if (d.promoLabel) setPromoLabel(d.promoLabel);
    if (d.paymentMethods) setPaymentMethods(d.paymentMethods);
    if (d.saveAsTemplate != null) setSaveAsTemplate(d.saveAsTemplate);
    if (d.templateName) setTemplateName(d.templateName);
    if (d.collectionOptions) setCollectionOptions(d.collectionOptions);
    if (d.deliveryOptions) setDeliveryOptions(d.deliveryOptions);
    if (d.vehicleType) setVehicleType(d.vehicleType);
    if (d.maxSinglePackageKg) setMaxSinglePackageKg(d.maxSinglePackageKg);
    if (d.currentStep) setCurrentStep(d.currentStep);
    setShowDraftBanner(false);
  };

  const discardDraft = () => {
    if (draftKey) AsyncStorage.removeItem(draftKey);
    setShowDraftBanner(false);
  };

  // ── Load previous routes on mount (if not already in store) ────────────────
  useEffect(() => {
    if (profile && routes.length === 0) {
      fetchRoutes(profile.id);
    }
  }, [profile?.id]);

  // ── Prefill from a previous route ──────────────────────────────────────────
  const applyPreviousRoute = (route: (typeof routes)[number]) => {
    const stops = route.route_stops ?? [];
    const collStops = stops
      .filter((s) => s.stop_type === "collection")
      .sort((a, b) => a.stop_order - b.stop_order);
    const dropStops = stops
      .filter((s) => s.stop_type === "dropoff")
      .sort((a, b) => a.stop_order - b.stop_order);

    setCollectionStops(
      collStops.length > 0
        ? collStops.map((s) => ({
            city_id: s.city_id,
            collection_date: "", // don't copy past dates
            location_name: (s as any).location_name ?? "",
            meeting_point_url: s.meeting_point_url ?? "",
          }))
        : [emptyCollStop()],
    );

    setDropoffStops(
      dropStops.length > 0
        ? dropStops.map((s) => ({
            city_id: s.city_id,
            estimated_arrival_date: "", // don't copy past dates
            location_name: (s as any).location_name ?? "",
            meeting_point_url: s.meeting_point_url ?? "",
          }))
        : [emptyDropStop()],
    );

    setWeightKg(String(route.available_weight_kg ?? 20));
    setPricePerKg(String(route.price_per_kg_eur ?? 5));
    if (route.min_weight_kg) setMinWeightKg(String(route.min_weight_kg));
    if (route.notes) setNotes(route.notes);
    if ((route as any).prohibited_items?.length)
      setProhibitedItems((route as any).prohibited_items);
    if (route.vehicle_type) setVehicleType(route.vehicle_type);

    // Restore logistics options from route_services if available
    const services: { service_type: string; price_eur: number }[] =
      (route as any).route_services ?? [];
    if (services.length > 0) {
      setCollectionOptions((prev) =>
        prev.map((opt) => {
          const svcType = COLL_KEY_TO_SERVICE_TYPE[opt.key];
          const match = services.find((s) => s.service_type === svcType);
          return match
            ? { ...opt, enabled: true, price: String(match.price_eur) }
            : opt;
        }),
      );
      setDeliveryOptions((prev) =>
        prev.map((opt) => {
          const svcType = DELV_KEY_TO_SERVICE_TYPE[opt.key];
          const match = services.find((s) => s.service_type === svcType);
          return match
            ? { ...opt, enabled: true, price: String(match.price_eur) }
            : opt;
        }),
      );
    }

    // Restore payment methods from route_payment_methods if available
    const pmRows: { payment_type: string; enabled: boolean }[] =
      (route as any).route_payment_methods ?? [];
    if (pmRows.length > 0) {
      const legacyMap: Record<string, string> = {
        cash_on_collection: "cash_sender",
        cash_on_delivery: "cash_recipient",
        paypal: "paypal",
      };
      const enabled = pmRows
        .filter((p) => p.enabled)
        .map((p) => legacyMap[p.payment_type] ?? p.payment_type);
      if (enabled.length > 0) setPaymentMethods(enabled);
    } else if (route.payment_methods?.length) {
      setPaymentMethods(route.payment_methods);
    }

    setCurrentStep(1);
    showToast("Route prefilled — update dates and submit", "success");
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const step1Valid = collectionStops.some((s) => s.city_id && s.collection_date);
  const step2Valid = dropoffStops.some((s) => s.city_id && s.estimated_arrival_date);
  const step4Valid =
    collectionOptions.some((o) => o.enabled) &&
    deliveryOptions.some((o) => o.enabled);
  const step5Valid =
    parseFloat(weightKg) > 0 &&
    parseFloat(pricePerKg) > 0 &&
    paymentMethods.length > 0;

  // ── Summaries ──────────────────────────────────────────────────────────────
  const derivedDepartureDate =
    collectionStops.find((s) => s.collection_date)?.collection_date ?? "";
  const step1Summary =
    collectionStops.filter((s) => s.city_id).length > 0
      ? [
          collectionStops
            .filter((s) => s.city_id)
            .map((s) => getCityName(s.city_id))
            .join(", "),
          derivedDepartureDate
            ? format(new Date(derivedDepartureDate), "MMM d, yyyy")
            : "",
        ]
          .filter(Boolean)
          .join("  ·  ")
      : "";
  const step2Summary =
    dropoffStops.filter((s) => s.city_id).length > 0
      ? `${dropoffStops.filter((s) => s.city_id).length} stop(s): ${dropoffStops
          .filter((s) => s.city_id)
          .map((s) => getCityName(s.city_id))
          .join(", ")}`
      : "No drop-off stops";
  const step3Summary = (() => {
    const parts: string[] = [];
    if (notes) parts.push(notes.slice(0, 40) + (notes.length > 40 ? "…" : ""));
    if (prohibitedItems.length > 0)
      parts.push(
        `${prohibitedItems.length} prohibited item${prohibitedItems.length > 1 ? "s" : ""}`,
      );
    return parts.join("  ·  ") || "No restrictions";
  })();

  const step4Summary = (() => {
    const coll = collectionOptions
      .filter((o) => o.enabled)
      .map(
        (o) =>
          t(
            COLLECTION_LOGISTICS_KEYS.find((l) => l.key === o.key)?.labelKey ??
              "",
          ).split(" ")[0],
      )
      .filter(Boolean)
      .join(", ");
    const delv = deliveryOptions
      .filter((o) => o.enabled)
      .map(
        (o) =>
          t(
            DELIVERY_LOGISTICS_KEYS.find((l) => l.key === o.key)?.labelKey ??
              "",
          ).split(" ")[0],
      )
      .filter(Boolean)
      .join(", ");
    return coll || delv
      ? `Collection: ${coll || "—"}  ·  Delivery: ${delv || "—"}`
      : "";
  })();

  const step5Summary =
    weightKg && pricePerKg ? `${weightKg} kg  ·  €${pricePerKg}/kg` : "";

  // ── Logistics helpers ───────────────────────────────────────────────────────
  const toggleCollOpt = (key: string) =>
    setCollectionOptions((prev) =>
      prev.map((o) => (o.key === key ? { ...o, enabled: !o.enabled } : o)),
    );
  const updateCollPrice = (key: string, price: string) =>
    setCollectionOptions((prev) =>
      prev.map((o) => (o.key === key ? { ...o, price } : o)),
    );
  const toggleDelOpt = (key: string) =>
    setDeliveryOptions((prev) =>
      prev.map((o) => (o.key === key ? { ...o, enabled: !o.enabled } : o)),
    );
  const updateDelPrice = (key: string, price: string) =>
    setDeliveryOptions((prev) =>
      prev.map((o) => (o.key === key ? { ...o, price } : o)),
    );

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
      return;
    }
    // On step 1: confirm leave if user has entered anything
    const hasData =
      collectionStops.some((s) => s.city_id) ||
      dropoffStops.some((s) => s.city_id);
    if (hasData) {
      Alert.alert("Leave?", "Your draft is saved and you can continue later.", [
        { text: "Keep Editing", style: "cancel" },
        { text: "Leave", style: "destructive", onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  // ── Collection stops helpers ───────────────────────────────────────────────
  const addCollectionStop = () => {
    if (collectionStops.length >= 8) return;
    setCollectionStops((p) => [
      ...p,
      {
        city_id: "",
        collection_date: "",
        location_name: "",
        meeting_point_url: "",
      },
    ]);
  };
  const removeCollectionStop = (i: number) =>
    setCollectionStops((p) => p.filter((_, idx) => idx !== i));
  const updateCollectionStop = (i: number, patch: Partial<CollectionStop>) =>
    setCollectionStops((p) =>
      p.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    );

  // ── Drop-off stops helpers ─────────────────────────────────────────────────
  const addDropoffStop = () => {
    if (dropoffStops.length >= 8) return;
    setDropoffStops((p) => [
      ...p,
      {
        city_id: "",
        estimated_arrival_date: "",
        location_name: "",
        meeting_point_url: "",
      },
    ]);
  };
  const removeDropoffStop = (i: number) =>
    setDropoffStops((p) => p.filter((_, idx) => idx !== i));
  const updateDropoffStop = (i: number, patch: Partial<DropoffStop>) =>
    setDropoffStops((p) =>
      p.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    );

  // ── Prohibited items helpers ───────────────────────────────────────────────
  const toggleProhibitedItem = (item: string) =>
    setProhibitedItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
    );
  const addCustomProhibitedItem = () => {
    const trimmed = customItemInput.trim();
    if (!trimmed || prohibitedItems.includes(trimmed)) return;
    setProhibitedItems((prev) => [...prev, trimmed]);
    setCustomItemInput("");
  };
  const removeProhibitedItem = (item: string) =>
    setProhibitedItems((prev) => prev.filter((i) => i !== item));

  // ── Payment method toggle ──────────────────────────────────────────────────
  const togglePayment = (method: string) => {
    setPaymentMethods((prev) => {
      if (prev.includes(method)) {
        if (prev.length === 1) return prev;
        return prev.filter((m) => m !== method);
      }
      return [...prev, method];
    });
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!profile) return;
    if (!step5Valid) {
      showToast(t("routeWizard.pricing.errors.fillPricing"), "error");
      return;
    }

    // ── Validation: Require city selection for stops ──
    const collectionWithCity = collectionStops.filter((s) => s.city_id);
    const dropoffWithCity = dropoffStops.filter((s) => s.city_id);
    const collectionWithDate = collectionStops.filter((s) => s.collection_date);
    const dropoffWithDate = dropoffStops.filter(
      (s) => s.estimated_arrival_date,
    );

    if (collectionWithCity.length === 0) {
      Alert.alert(
        "Missing Pickup Location",
        "Please select at least one city for pickup/collection.",
        [{ text: "OK" }],
      );
      return;
    }

    if (dropoffWithCity.length === 0) {
      Alert.alert(
        "Missing Delivery Location",
        "Please select at least one city for delivery/dropoff.",
        [{ text: "OK" }],
      );
      return;
    }

    if (collectionWithDate.length === 0) {
      Alert.alert(
        "Missing Pickup Date",
        "Please set a departure date for at least one pickup location.",
        [{ text: "OK" }],
      );
      return;
    }

    if (dropoffWithDate.length === 0) {
      Alert.alert(
        "Missing Delivery Date",
        "Please set an arrival date for at least one delivery location.",
        [{ text: "OK" }],
      );
      return;
    }

    // Note: Duplicate route check via origin_city_id/destination_city_id removed
    // after migration to route_stops as single source of truth.
    // Duplicate detection via route_stops would require complex nested queries.
    await doCreate();
  };

  const doCreate = async () => {
    if (!profile) return;
    setIsSubmitting(true);
    try {
      const collStops = collectionStops
        .filter((s) => s.city_id)
        .map((s, i) => ({
          city_id: s.city_id,
          stop_order: i + 1,
          stop_type: "collection" as const,
          arrival_date: s.collection_date || null,
          location_name: s.location_name || null,
          meeting_point_url: s.meeting_point_url || null,
          is_pickup_available: true,
          is_dropoff_available: false,
        }));

      const dropStops = dropoffStops
        .filter((s) => s.city_id)
        .map((s, i) => ({
          city_id: s.city_id,
          stop_order: collStops.length + i + 1,
          stop_type: "dropoff" as const,
          arrival_date: s.estimated_arrival_date || null,
          location_name: s.location_name || null,
          meeting_point_url: s.meeting_point_url || null,
          is_pickup_available: false,
          is_dropoff_available: true,
        }));

      const pct =
        promoEnabled && promoDiscountPct ? parseInt(promoDiscountPct) : null;

      const departure_date =
        collStops[0]?.arrival_date || new Date().toISOString().split("T")[0];

      const routeId = await createRoute(profile.id, {
        departure_date,
        estimated_arrival_date: dropStops[0]?.arrival_date ?? null,
        available_weight_kg: parseFloat(weightKg),
        min_weight_kg: parseFloat(minWeightKg) || 10,
        price_per_kg_eur: parseFloat(pricePerKg),
        notes: notes || null,
        payment_methods: paymentMethods,
        promo_discount_pct: pct,
        promo_expires_at:
          promoEnabled && promoExpiresAt ? promoExpiresAt : null,
        promo_label: promoEnabled && promoLabel ? promoLabel : null,
        stops: [...collStops, ...dropStops],
        logistics_options: [
          ...collectionOptions
            .filter((o) => o.enabled)
            .map((o) => ({
              type: "collection" as const,
              key: o.key,
              price_eur: parseFloat(o.price) || 0,
            })),
          ...deliveryOptions
            .filter((o) => o.enabled)
            .map((o) => ({
              type: "delivery" as const,
              key: o.key,
              price_eur: parseFloat(o.price) || 0,
            })),
        ],
        prohibited_items: prohibitedItems,
        // New normalised service rows
        vehicle_type: vehicleType || null,
        max_single_package_kg: maxSinglePackageKg
          ? parseFloat(maxSinglePackageKg)
          : null,
        services: [
          ...collectionOptions
            .filter((o) => o.enabled && COLL_KEY_TO_SERVICE_TYPE[o.key])
            .map((o) => ({
              service_type: COLL_KEY_TO_SERVICE_TYPE[o.key],
              price_eur: parseFloat(o.price) || 0,
            })),
          ...deliveryOptions
            .filter((o) => o.enabled && DELV_KEY_TO_SERVICE_TYPE[o.key])
            .map((o) => ({
              service_type: DELV_KEY_TO_SERVICE_TYPE[o.key],
              price_eur: parseFloat(o.price) || 0,
            })),
        ],
        payment_types: [
          {
            payment_type: "cash_on_collection" as const,
            enabled: paymentMethods.includes("cash_sender"),
          },
          {
            payment_type: "cash_on_delivery" as const,
            enabled: paymentMethods.includes("cash_recipient"),
          },
          { payment_type: "credit_debit_card" as const, enabled: false },
          {
            payment_type: "paypal" as const,
            enabled: paymentMethods.includes("paypal"),
          },
        ],
        save_as_template: saveAsTemplate,
        template_name: saveAsTemplate
          ? templateName ||
            [
              collStops.map((s) => getCityName(s.city_id)).join(", "),
              dropStops.map((s) => getCityName(s.city_id)).join(", "),
            ]
              .filter(Boolean)
              .join(" → ")
          : undefined,
      });

      await publishRoute(routeId);

      if (draftKey) await AsyncStorage.removeItem(draftKey);
      showToast(t("routeWizard.pricing.toast.success"), "success");
      router.back();
    } catch (err) {
      const message = (err as Error)?.message ?? "";
      const isOffline =
        message.includes("network") ||
        message.includes("fetch") ||
        message.includes("NetworkError");
      if (isOffline) {
        try {
          await AsyncStorage.setItem(
            QUEUE_KEY,
            JSON.stringify({
              weightKg,
              pricePerKg,
              notes,
              paymentMethods,
              promoEnabled,
              promoDiscountPct,
              promoExpiresAt,
              promoLabel,
              collectionStops,
              dropoffStops,
              profileId: profile.id,
            }),
          );
          showToast(t("routeWizard.pricing.toast.offline"), "info");
        } catch {
          showToast(t("routeWizard.pricing.toast.failed"), "error");
        }
      } else {
        showToast(message || t("routeWizard.pricing.toast.failed"), "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const today = new Date();
  const isFirstRoute = routes.length === 0;
  const discountedPrice =
    promoEnabled && pricePerKg && promoDiscountPct
      ? (
          parseFloat(pricePerKg) *
          (1 - parseInt(promoDiscountPct) / 100)
        ).toFixed(2)
      : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <ArrowLeft size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>{t("routeWizard.navTitle")}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Wide: form left + summary right. Narrow: form full-width + bottom bar */}
      <View style={[{ flex: 1 }, isWide && styles.wideBody]}>
        <KeyboardAvoidingView
          style={isWide ? styles.formArea : { flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            stickyHeaderIndices={[0]}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={f.scrollContent}
          >
            {/* ── Sticky step indicator ────────────────────── */}
            <StepIndicator currentStep={currentStep} />

            {/* Draft recovery */}
            {showDraftBanner && (
              <View style={f.draftBanner}>
                <Text style={f.draftBannerText}>
                  {t("routeWizard.draftBanner")}
                </Text>
                <View style={f.draftBannerActions}>
                  <TouchableOpacity onPress={restoreDraft}>
                    <Text style={f.draftContinue}>{t("common.continue")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={discardDraft}>
                    <Text style={f.draftDiscard}>{t("common.discard")}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── Copy from previous route ─────────────────── */}
            {routes.length > 0 && (
              <View style={f.prevRoutesSection}>
                <Text style={f.prevRoutesTitle}>
                  Copy from a previous route
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={f.prevRoutesRow}
                  keyboardShouldPersistTaps="handled"
                >
                  {routes.slice(0, 6).map((route) => {
                    const collStop = route.route_stops?.find(
                      (s) => s.stop_type === "collection",
                    );
                    const dropStop = route.route_stops?.find(
                      (s) => s.stop_type === "dropoff",
                    );
                    const collCity = collStop?.city_id
                      ? getCityName(collStop.city_id)
                      : undefined;
                    const dropCity = dropStop?.city_id
                      ? getCityName(dropStop.city_id)
                      : undefined;
                    const label =
                      collCity && dropCity
                        ? `${collCity} → ${dropCity}`
                        : "Unknown → Unknown";
                    return (
                      <TouchableOpacity
                        key={route.id}
                        style={f.prevRouteChip}
                        onPress={() => applyPreviousRoute(route)}
                        activeOpacity={0.75}
                      >
                        <Text style={f.prevRouteChipLabel} numberOfLines={1}>
                          {label}
                        </Text>
                        <Text style={f.prevRouteChipSub}>
                          {route.price_per_kg_eur
                            ? `€${route.price_per_kg_eur}/kg`
                            : ""}
                          {route.available_weight_kg
                            ? `  ·  ${route.available_weight_kg} kg`
                            : ""}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* ════════════════════════════════════════════════
              Step 1 — Collection Stops
          ════════════════════════════════════════════════ */}
            <StepCard
              stepNum={1}
              title={t("routeWizard.collection.title")}
              isActive={currentStep === 1}
              isCompleted={currentStep > 1}
              isLocked={false}
              summary={step1Summary}
              onEdit={() => setCurrentStep(1)}
            >
              {isFirstRoute && (
                <View style={f.tooltip}>
                  <Text style={f.tooltipText}>
                    Senders browse your route and book space. You confirm each
                    booking and earn money on trips you already make.
                  </Text>
                </View>
              )}

              <Text style={f.stepDesc}>
                Add the cities where you will collect packages. Stop 1's date is
                used as your departure date.
              </Text>

              {collectionStops.map((stop, idx) => (
                <View key={idx} style={f.stopCard}>
                  <View style={f.stopHeader}>
                    <View style={f.stopHandleRow}>
                      <GripVertical size={14} color={Colors.text.tertiary} />
                      <Text style={f.stopNum}>
                        {t("routeWizard.collection.stopNum", { num: idx + 1 })}
                      </Text>
                    </View>
                    {collectionStops.length > 1 && (
                      <TouchableOpacity
                        onPress={() => removeCollectionStop(idx)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={15} color={Colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={f.fieldLabel}>
                    {t("routeWizard.collection.cityLabel")}
                  </Text>
                  <CityPickerInput
                    value={stop.city_id ? getCityName(stop.city_id) : undefined}
                    country={
                      stop.city_id ? getCountry(stop.city_id) : undefined
                    }
                    cities={collectionCities}
                    placeholder={
                      citiesLoading
                        ? "Loading cities…"
                        : t("routeWizard.collection.cityPlaceholder")
                    }
                    onChange={(city) =>
                      updateCollectionStop(idx, { city_id: city.id })
                    }
                  />
                  <Text style={f.fieldLabel}>
                    {idx === 0
                      ? t("routeWizard.collection.departureDateLabel")
                      : t("routeWizard.collection.collectionDateLabel")}
                  </Text>
                  <DateInput
                    value={stop.collection_date}
                    onChange={(v) =>
                      updateCollectionStop(idx, { collection_date: v })
                    }
                    minDate={today}
                    placeholder="Required"
                  />
                  <Text style={f.fieldLabel}>Location name</Text>
                  <TextInput
                    style={f.input}
                    value={stop.location_name}
                    onChangeText={(v) =>
                      updateCollectionStop(idx, { location_name: v })
                    }
                    placeholder="e.g. BP Station, Gate 3, Parking level B"
                    placeholderTextColor={Colors.text.tertiary}
                  />
                  <Text style={f.fieldLabel}>
                    {t("routeWizard.collection.meetingPointLabel")}
                  </Text>
                  <URLInput
                    value={stop.meeting_point_url}
                    onChangeText={(t) =>
                      updateCollectionStop(idx, { meeting_point_url: t })
                    }
                    placeholder="https://maps.app.goo.gl/…"
                  />
                </View>
              ))}

              <TouchableOpacity
                style={[
                  f.addStopBtn,
                  collectionStops.length >= 8 && f.addStopBtnDisabled,
                ]}
                onPress={addCollectionStop}
                disabled={collectionStops.length >= 8}
                activeOpacity={0.75}
              >
                <Plus
                  size={16}
                  color={
                    collectionStops.length >= 8
                      ? Colors.text.tertiary
                      : Colors.primary
                  }
                  strokeWidth={2.5}
                />
                <Text
                  style={[
                    f.addStopBtnText,
                    collectionStops.length >= 8 && f.addStopBtnTextDisabled,
                  ]}
                >
                  {collectionStops.length >= 8
                    ? t("routeWizard.collection.maxStops")
                    : t("routeWizard.collection.addStop")}
                </Text>
              </TouchableOpacity>

              <Button
                label={t("common.continue")}
                onPress={() => {
                  if (!step1Valid) {
                    showToast(t("routeWizard.collection.error"), "error");
                    return;
                  }
                  setCurrentStep(2);
                }}
                size="lg"
                style={f.continueBtn}
              />
            </StepCard>

            {/* ════════════════════════════════════════════════
              Step 2 — Drop-off Stops
          ════════════════════════════════════════════════ */}
            <StepCard
              stepNum={2}
              title={t("routeWizard.dropoff.title")}
              isActive={currentStep === 2}
              isCompleted={currentStep > 2}
              isLocked={currentStep < 2}
              summary={step2Summary}
              onEdit={() => setCurrentStep(2)}
            >
              <View style={f.estimateNote}>
                <Info size={13} color={Colors.secondary} />
                <Text style={f.estimateNoteText}>
                  Arrival dates are estimates. Senders will see these as
                  guidelines, not guarantees.
                </Text>
              </View>

              {dropoffStops.map((stop, idx) => (
                <View key={idx} style={f.stopCard}>
                  <View style={f.stopHeader}>
                    <View style={f.stopHandleRow}>
                      <GripVertical size={14} color={Colors.text.tertiary} />
                      <Text style={f.stopNum}>
                        {t("routeWizard.dropoff.stopNum", { num: idx + 1 })}
                      </Text>
                    </View>
                    {dropoffStops.length > 1 && (
                      <TouchableOpacity
                        onPress={() => removeDropoffStop(idx)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={15} color={Colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={f.fieldLabel}>
                    {t("routeWizard.dropoff.cityLabel")}
                  </Text>
                  <CityPickerInput
                    value={stop.city_id ? getCityName(stop.city_id) : undefined}
                    country={
                      stop.city_id ? getCountry(stop.city_id) : undefined
                    }
                    cities={dropoffCities}
                    placeholder={
                      citiesLoading
                        ? "Loading cities…"
                        : t("routeWizard.dropoff.cityPlaceholder")
                    }
                    onChange={(city) =>
                      updateDropoffStop(idx, { city_id: city.id })
                    }
                  />
                  <Text style={f.fieldLabel}>Location name</Text>
                  <TextInput
                    style={f.input}
                    value={stop.location_name}
                    onChangeText={(v) =>
                      updateDropoffStop(idx, { location_name: v })
                    }
                    placeholder="e.g. Family home, Sfax warehouse, Shop name"
                    placeholderTextColor={Colors.text.tertiary}
                  />
                  <Text style={f.fieldLabel}>
                    {t("routeWizard.dropoff.arrivalLabel")}
                  </Text>
                  <DateInput
                    value={stop.estimated_arrival_date}
                    onChange={(v) =>
                      updateDropoffStop(idx, { estimated_arrival_date: v })
                    }
                    minDate={
                      derivedDepartureDate
                        ? new Date(derivedDepartureDate)
                        : today
                    }
                    placeholder="Required"
                  />
                  <Text style={f.fieldLabel}>
                    {t("routeWizard.dropoff.meetingPointLabel")}
                  </Text>
                  <URLInput
                    value={stop.meeting_point_url}
                    onChangeText={(t) =>
                      updateDropoffStop(idx, { meeting_point_url: t })
                    }
                    placeholder="https://maps.app.goo.gl/…"
                  />
                </View>
              ))}

              <TouchableOpacity
                style={[
                  f.addStopBtn,
                  dropoffStops.length >= 8 && f.addStopBtnDisabled,
                ]}
                onPress={addDropoffStop}
                disabled={dropoffStops.length >= 8}
                activeOpacity={0.75}
              >
                <Plus
                  size={16}
                  color={
                    dropoffStops.length >= 8
                      ? Colors.text.tertiary
                      : Colors.primary
                  }
                  strokeWidth={2.5}
                />
                <Text
                  style={[
                    f.addStopBtnText,
                    dropoffStops.length >= 8 && f.addStopBtnTextDisabled,
                  ]}
                >
                  {dropoffStops.length >= 8
                    ? t("routeWizard.dropoff.maxStops")
                    : t("routeWizard.dropoff.addStop")}
                </Text>
              </TouchableOpacity>

              <Button
                label={t("common.continue")}
                onPress={() => {
                  if (!step2Valid) {
                    showToast(t("routeWizard.dropoff.error"), "error");
                    return;
                  }
                  setCurrentStep(3);
                }}
                size="lg"
                style={f.continueBtn}
              />
            </StepCard>

            {/* ════════════════════════════════════════════════
              Step 3 — Notes & Rules
          ════════════════════════════════════════════════ */}
            <StepCard
              stepNum={3}
              title={t("routeWizard.notes.title")}
              isActive={currentStep === 3}
              isCompleted={currentStep > 3}
              isLocked={currentStep < 3}
              summary={step3Summary}
              onEdit={() => setCurrentStep(3)}
            >
              <Text style={f.stepDesc}>
                Let senders know what to expect and what you won't accept.
              </Text>

              {/* Notes */}
              <Text style={f.fieldLabel}>
                {t("routeWizard.notes.senderNotesLabel")}
              </Text>
              <TextInput
                style={[f.input, f.inputMultiline]}
                value={notes}
                onChangeText={setNotes}
                placeholder={t("routeWizard.notes.placeholder")}
                placeholderTextColor={Colors.text.tertiary}
                multiline
                numberOfLines={3}
              />

              {/* Prohibited items */}
              <Text style={[f.sectionSubtitle, { marginTop: Spacing.base }]}>
                {t("routeWizard.notes.prohibitedItems")}
              </Text>
              <Text style={f.stepDesc}>
                Select items you won't transport. Senders see this before
                booking.
              </Text>

              <View style={f.chipsGrid}>
                {PROHIBITED_PRESETS.map((item) => {
                  const active = prohibitedItems.includes(item);
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[f.presetChip, active && f.presetChipActive]}
                      onPress={() => toggleProhibitedItem(item)}
                      activeOpacity={0.7}
                    >
                      {active && (
                        <X size={10} color={Colors.error} strokeWidth={3} />
                      )}
                      <Text
                        style={[
                          f.presetChipText,
                          active && f.presetChipTextActive,
                        ]}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom items (not in presets) */}
              {prohibitedItems.filter((i) => !PROHIBITED_PRESETS.includes(i))
                .length > 0 && (
                <View style={f.customChipsRow}>
                  {prohibitedItems
                    .filter((i) => !PROHIBITED_PRESETS.includes(i))
                    .map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={f.customChip}
                        onPress={() => removeProhibitedItem(item)}
                        activeOpacity={0.7}
                      >
                        <Text style={f.customChipText}>{item}</Text>
                        <X size={10} color={Colors.error} strokeWidth={3} />
                      </TouchableOpacity>
                    ))}
                </View>
              )}

              {/* Add custom item */}
              <View style={f.customItemRow}>
                <TextInput
                  style={[f.input, { flex: 1, marginBottom: 0 }]}
                  value={customItemInput}
                  onChangeText={setCustomItemInput}
                  placeholder={t("routeWizard.notes.addCustom")}
                  placeholderTextColor={Colors.text.tertiary}
                  onSubmitEditing={addCustomProhibitedItem}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={[
                    f.addItemBtn,
                    !customItemInput.trim() && f.addItemBtnDisabled,
                  ]}
                  onPress={addCustomProhibitedItem}
                  disabled={!customItemInput.trim()}
                >
                  <Plus
                    size={16}
                    color={
                      customItemInput.trim()
                        ? Colors.white
                        : Colors.text.tertiary
                    }
                    strokeWidth={2.5}
                  />
                </TouchableOpacity>
              </View>

              <Button
                label={t("common.continue")}
                onPress={() => setCurrentStep(4)}
                size="lg"
                style={f.continueBtn}
              />
            </StepCard>

            {/* ════════════════════════════════════════════════
              Step 4 — Services
          ════════════════════════════════════════════════ */}
            <StepCard
              stepNum={4}
              title={t("routeWizard.services.title")}
              isActive={currentStep === 4}
              isCompleted={currentStep > 4}
              isLocked={currentStep < 4}
              summary={step4Summary}
              onEdit={() => setCurrentStep(4)}
            >
              <Text style={f.stepDesc}>
                Choose what services you offer and set your fee for each.
                Senders see these options when booking.
              </Text>

              <Text style={f.sectionSubtitle}>
                {t("routeWizard.services.collection")}
              </Text>
              {COLLECTION_LOGISTICS_KEYS.map((opt) => {
                const state = collectionOptions.find((o) => o.key === opt.key)!;
                return (
                  <LogisticsOptionCard
                    key={opt.key}
                    label={t(opt.labelKey)}
                    desc={t(opt.descKey)}
                    free={opt.free}
                    enabled={state.enabled}
                    price={state.price}
                    onToggle={() => toggleCollOpt(opt.key)}
                    onChangePrice={(v) => updateCollPrice(opt.key, v)}
                  />
                );
              })}

              <Text style={[f.sectionSubtitle, { marginTop: Spacing.base }]}>
                {t("routeWizard.services.delivery")}
              </Text>
              {DELIVERY_LOGISTICS_KEYS.map((opt) => {
                const state = deliveryOptions.find((o) => o.key === opt.key)!;
                return (
                  <LogisticsOptionCard
                    key={opt.key}
                    label={t(opt.labelKey)}
                    desc={t(opt.descKey)}
                    free={opt.free}
                    enabled={state.enabled}
                    price={state.price}
                    onToggle={() => toggleDelOpt(opt.key)}
                    onChangePrice={(v) => updateDelPrice(opt.key, v)}
                  />
                );
              })}

              <Button
                label={t("common.continue")}
                onPress={() => {
                  if (!step4Valid) {
                    showToast(t("routeWizard.services.error"), "error");
                    return;
                  }
                  setCurrentStep(5);
                }}
                size="lg"
                style={f.continueBtn}
              />
            </StepCard>

            {/* ════════════════════════════════════════════════
              Step 5 — Pricing & Settings
          ════════════════════════════════════════════════ */}
            <StepCard
              stepNum={5}
              title={t("routeWizard.pricing.title")}
              isActive={currentStep === 5}
              isCompleted={false}
              isLocked={currentStep < 5}
              summary={step5Summary}
              onEdit={() => setCurrentStep(5)}
            >
              {/* Capacity */}
              <Text style={f.sectionSubtitle}>
                {t("routeWizard.pricing.capacity")}
              </Text>
              <View style={f.capacityRow}>
                <View style={{ flex: 1 }}>
                  <Text style={f.fieldLabel}>
                    {t("routeWizard.pricing.availableWeight")}
                  </Text>
                  <TextInput
                    style={f.input}
                    value={weightKg}
                    onChangeText={setWeightKg}
                    keyboardType="decimal-pad"
                    placeholder="20"
                    placeholderTextColor={Colors.text.tertiary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={f.fieldLabel}>
                    {t("routeWizard.pricing.minWeight")}
                  </Text>
                  <TextInput
                    style={f.input}
                    value={minWeightKg}
                    onChangeText={setMinWeightKg}
                    keyboardType="decimal-pad"
                    placeholder="10"
                    placeholderTextColor={Colors.text.tertiary}
                  />
                </View>
              </View>
              <View style={f.tipRow}>
                <Info size={11} color={Colors.text.tertiary} />
                <Text style={f.tipText}>
                  Max capacity decreases as bookings are accepted. Senders
                  cannot book below the minimum.
                </Text>
              </View>

              {/* Pricing */}
              <Text style={[f.sectionSubtitle, { marginTop: Spacing.base }]}>
                {t("routeWizard.pricing.basePrice")}
              </Text>
              <Text style={f.fieldLabel}>
                {t("routeWizard.pricing.pricePerKg")}
              </Text>
              <TextInput
                style={f.input}
                value={pricePerKg}
                onChangeText={setPricePerKg}
                keyboardType="decimal-pad"
                placeholder="5"
                placeholderTextColor={Colors.text.tertiary}
              />

              {/* Promo toggle */}
              <View style={f.toggleRow}>
                <Switch
                  value={promoEnabled}
                  onValueChange={setPromoEnabled}
                  trackColor={{ true: Colors.primary }}
                />
                <Text style={f.toggleLabel}>
                  {t("routeWizard.pricing.promo")}
                </Text>
              </View>

              {promoEnabled && (
                <View style={f.collapsibleContent}>
                  <Text style={f.fieldLabel}>
                    {t("routeWizard.pricing.discount")}
                  </Text>
                  <TextInput
                    style={f.input}
                    value={promoDiscountPct}
                    onChangeText={setPromoDiscountPct}
                    keyboardType="number-pad"
                    placeholder="e.g. 15"
                    placeholderTextColor={Colors.text.tertiary}
                  />
                  {discountedPrice && (
                    <View style={f.liveCalcRow}>
                      <Text style={f.liveCalcText}>
                        Senders pay{" "}
                        <Text style={f.liveCalcPrice}>
                          €{discountedPrice}/kg
                        </Text>
                      </Text>
                    </View>
                  )}
                  <Text style={f.fieldLabel}>
                    {t("routeWizard.pricing.expiresAt")}
                  </Text>
                  <DateInput
                    value={promoExpiresAt}
                    onChange={setPromoExpiresAt}
                    minDate={new Date(Date.now() + 86400000)}
                    placeholder="Optional"
                  />
                  <Text style={f.fieldLabel}>
                    {t("routeWizard.pricing.promoLabel")}
                  </Text>
                  <TextInput
                    style={f.input}
                    value={promoLabel}
                    onChangeText={setPromoLabel}
                    placeholder="e.g. Early bird, Summer special"
                    placeholderTextColor={Colors.text.tertiary}
                    maxLength={30}
                  />
                </View>
              )}

              {/* Payment methods */}
              <Text style={[f.sectionSubtitle, { marginTop: Spacing.base }]}>
                {t("routeWizard.pricing.paymentMethods")}
              </Text>
              {PAYMENT_METHODS.map((method) => (
                <TouchableOpacity
                  key={method}
                  style={f.paymentRow}
                  onPress={() => togglePayment(method)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      f.checkbox,
                      paymentMethods.includes(method) && f.checkboxChecked,
                    ]}
                  >
                    {paymentMethods.includes(method) && (
                      <Text style={f.checkboxTick}>✓</Text>
                    )}
                  </View>
                  <Text style={f.paymentLabel}>{PAYMENT_LABELS[method]}</Text>
                </TouchableOpacity>
              ))}

              {/* Template toggle */}
              <View style={[f.toggleRow, { marginTop: Spacing.base }]}>
                <Switch
                  value={saveAsTemplate}
                  onValueChange={setSaveAsTemplate}
                  trackColor={{ true: Colors.primary }}
                />
                <Text style={f.toggleLabel}>
                  {t("routeWizard.pricing.saveTemplate")}
                </Text>
              </View>

              {saveAsTemplate && (
                <View style={f.collapsibleContent}>
                  <Text style={f.fieldLabel}>
                    {t("routeWizard.pricing.templateName")}
                  </Text>
                  <TextInput
                    style={f.input}
                    value={
                      templateName ||
                      [
                        collectionStops
                          .filter((s) => s.city_id)
                          .map((s) => getCityName(s.city_id))
                          .join(", "),
                        dropoffStops
                          .filter((s) => s.city_id)
                          .map((s) => getCityName(s.city_id))
                          .join(", "),
                      ]
                        .filter(Boolean)
                        .join(" → ")
                    }
                    onChangeText={setTemplateName}
                    placeholder="Template name"
                    placeholderTextColor={Colors.text.tertiary}
                    maxLength={60}
                  />
                  <Text style={f.templateHint}>
                    Reuse this setup for future trips on the same corridor
                  </Text>
                </View>
              )}

              {/* On narrow screens: inline route summary before submit */}
              {!isWide && (
                <RouteSummaryCard
                  originCity={
                    collectionStops.find((s) => s.city_id)
                      ? getCityName(
                          collectionStops.find((s) => s.city_id)!.city_id,
                        )
                      : ""
                  }
                  originCountry={
                    collectionStops.find((s) => s.city_id)
                      ? getCountry(
                          collectionStops.find((s) => s.city_id)!.city_id,
                        )
                      : ""
                  }
                  destinationCity={
                    dropoffStops.find((s) => s.city_id)
                      ? getCityName(
                          dropoffStops.find((s) => s.city_id)!.city_id,
                        )
                      : ""
                  }
                  destinationCountry={
                    dropoffStops.find((s) => s.city_id)
                      ? getCountry(dropoffStops.find((s) => s.city_id)!.city_id)
                      : ""
                  }
                  departureDate={derivedDepartureDate}
                  estimatedArrivalDate={
                    dropoffStops.find((s) => s.estimated_arrival_date)
                      ?.estimated_arrival_date ?? ""
                  }
                  weightKg={weightKg}
                  pricePerKg={pricePerKg}
                  promoEnabled={promoEnabled}
                  promoDiscountPct={promoDiscountPct}
                  promoLabel={promoLabel}
                  paymentMethods={paymentMethods}
                  collectionStops={collectionStops
                    .filter((s) => s.city_id)
                    .map((s) => ({
                      city: getCityName(s.city_id),
                      country: getCountry(s.city_id),
                      date: s.collection_date,
                    }))}
                  dropoffStops={dropoffStops
                    .filter((s) => s.city_id)
                    .map((s) => ({
                      city: getCityName(s.city_id),
                      country: getCountry(s.city_id),
                      date: s.estimated_arrival_date,
                    }))}
                  prohibitedItems={prohibitedItems}
                />
              )}

              <Button
                label={
                  isSubmitting
                    ? t("routeWizard.pricing.submitting")
                    : t("routeWizard.pricing.submit")
                }
                onPress={handleSubmit}
                isLoading={isSubmitting}
                size="lg"
                style={f.continueBtn}
              />
            </StepCard>
          </ScrollView>

          {/* Mobile bottom summary bar — narrow screens only */}
          {!isWide &&
            collectionStops.some((s) => s.city_id) &&
            currentStep < 5 && (
              <View style={styles.mobileSummaryBar}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mobileSummaryRoute} numberOfLines={1}>
                    {collectionStops.find((s) => s.city_id)
                      ? getCityName(
                          collectionStops.find((s) => s.city_id)!.city_id,
                        )
                      : "?"}{" "}
                    →{" "}
                    {dropoffStops.find((s) => s.city_id)
                      ? getCityName(
                          dropoffStops.find((s) => s.city_id)!.city_id,
                        )
                      : "…"}
                  </Text>
                  <Text style={styles.mobileSummaryMeta}>
                    {derivedDepartureDate
                      ? format(new Date(derivedDepartureDate), "MMM d, yyyy")
                      : "No date set"}
                    {pricePerKg ? `  ·  €${pricePerKg}/kg` : ""}
                  </Text>
                </View>
              </View>
            )}
        </KeyboardAvoidingView>

        {/* Summary sidebar — wide screens only */}
        {isWide && (
          <ScrollView
            style={styles.summarySidebar}
            showsVerticalScrollIndicator={false}
          >
            <RouteSummaryCard
              originCity={
                collectionStops.find((s) => s.city_id)
                  ? getCityName(collectionStops.find((s) => s.city_id)!.city_id)
                  : ""
              }
              originCountry={
                collectionStops.find((s) => s.city_id)
                  ? getCountry(collectionStops.find((s) => s.city_id)!.city_id)
                  : ""
              }
              destinationCity={
                dropoffStops.find((s) => s.city_id)
                  ? getCityName(dropoffStops.find((s) => s.city_id)!.city_id)
                  : ""
              }
              destinationCountry={
                dropoffStops.find((s) => s.city_id)
                  ? getCountry(dropoffStops.find((s) => s.city_id)!.city_id)
                  : ""
              }
              departureDate={derivedDepartureDate}
              estimatedArrivalDate={
                dropoffStops.find((s) => s.estimated_arrival_date)
                  ?.estimated_arrival_date ?? ""
              }
              weightKg={weightKg}
              pricePerKg={pricePerKg}
              promoEnabled={promoEnabled}
              promoDiscountPct={promoDiscountPct}
              promoLabel={promoLabel}
              paymentMethods={paymentMethods}
              collectionStops={collectionStops
                .filter((s) => s.city_id)
                .map((s) => ({
                  city: getCityName(s.city_id),
                  country: getCountry(s.city_id),
                }))}
              dropoffStops={dropoffStops
                .filter((s) => s.city_id)
                .map((s) => ({
                  city: getCityName(s.city_id),
                  country: getCountry(s.city_id),
                }))}
              prohibitedItems={prohibitedItems}
            />
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    backgroundColor: Colors.background.primary,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.text.primary,
  },
  wideBody: {
    flex: 1,
    flexDirection: "row",
  },
  formArea: {
    flex: 2,
  },
  summarySidebar: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border.light,
    backgroundColor: Colors.background.secondary,
  },
  mobileSummaryBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 4,
  },
  mobileSummaryRoute: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.text.primary,
  },
  mobileSummaryMeta: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    marginTop: 2,
  },
});

// Logistics option card
const lg = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.background.secondary,
    overflow: "hidden",
  },
  cardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border.medium,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  label: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.text.primary,
    marginBottom: 2,
  },
  labelMuted: { color: Colors.text.secondary },
  desc: { fontSize: FontSize.xs, color: Colors.text.secondary, lineHeight: 18 },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  priceLabel: { fontSize: FontSize.xs, color: Colors.text.secondary, flex: 1 },
  priceInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.sm,
    height: 36,
    gap: 2,
  },
  priceSymbol: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.text.primary,
  },
  priceInput: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.text.primary,
    minWidth: 40,
    textAlign: "right",
  },
  freeBadge: {
    backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  freeBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: Colors.success,
  },
});

// Step indicator
const si = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  item: { alignItems: "center", gap: 4 },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background.tertiary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.border.medium,
  },
  dotActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dotDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  dotNum: { fontSize: 11, fontWeight: "700", color: Colors.text.tertiary },
  dotNumActive: { color: Colors.white },
  label: { fontSize: 10, fontWeight: "500", color: Colors.text.tertiary },
  labelActive: { color: Colors.text.primary, fontWeight: "700" },
  labelDone: { color: Colors.success },
  line: {
    flex: 1,
    height: 1.5,
    backgroundColor: Colors.border.light,
    marginBottom: 14,
  },
  lineDone: { backgroundColor: Colors.success },
});

// Step card
const sc = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
    padding: Spacing.base,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardLocked: { opacity: 0.55 },
  header: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.background.tertiary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.border.medium,
  },
  badgeActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  badgeDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  badgeNum: { fontSize: 11, fontWeight: "700", color: Colors.text.tertiary },
  badgeNumActive: { color: Colors.white },
  title: {
    flex: 1,
    fontSize: FontSize.base,
    fontWeight: "700",
    color: Colors.text.primary,
  },
  titleLocked: { color: Colors.text.tertiary },
  editBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  editText: {
    fontSize: FontSize.sm,
    color: Colors.secondary,
    fontWeight: "600",
  },
  summary: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    marginTop: Spacing.sm,
    marginLeft: 38,
  },
  body: { marginTop: Spacing.base },
});

// Form elements
const f = StyleSheet.create({
  scrollContent: { paddingBottom: Spacing["4xl"] },

  // Draft banner
  draftBanner: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
    backgroundColor: Colors.secondaryLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  draftBannerText: {
    fontSize: FontSize.sm,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  draftBannerActions: { flexDirection: "row", gap: Spacing.base },
  draftContinue: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.secondary,
  },
  draftDiscard: { fontSize: FontSize.sm, color: Colors.text.secondary },

  // Tooltip
  tooltip: {
    backgroundColor: Colors.secondaryLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.base,
  },
  tooltipText: {
    fontSize: FontSize.sm,
    color: Colors.secondary,
    lineHeight: 20,
  },

  // Field labels
  fieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: Colors.text.secondary,
    marginBottom: 4,
    marginTop: Spacing.sm,
  },
  sectionSubtitle: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  stepDesc: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.base,
    lineHeight: 20,
  },

  // Inputs
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: Spacing.sm,
    fontSize: FontSize.base,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  inputMultiline: {
    height: 80,
    paddingTop: Spacing.sm,
    textAlignVertical: "top",
  },

  // Tip row
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: -Spacing.xs,
    marginBottom: Spacing.sm,
  },
  tipText: { fontSize: FontSize.xs, color: Colors.text.tertiary, flex: 1 },

  // Stop cards
  stopCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  stopHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  stopHandleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  stopNum: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.text.primary,
  },

  // Add stop button
  addStopBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: "dashed",
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.primaryLight,
  },
  addStopBtnDisabled: {
    borderColor: Colors.border.medium,
    backgroundColor: Colors.background.secondary,
  },
  addStopBtnText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: "700",
  },
  addStopBtnTextDisabled: { color: Colors.text.tertiary, fontWeight: "400" },

  // Estimate note
  estimateNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    backgroundColor: Colors.secondaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.base,
  },
  estimateNoteText: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    flex: 1,
  },

  // Toggle row
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  toggleLabel: {
    fontSize: FontSize.base,
    fontWeight: "600",
    color: Colors.text.primary,
    flex: 1,
  },
  collapsibleContent: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },

  // Promo live calc
  liveCalcRow: {
    backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  liveCalcText: { fontSize: FontSize.sm, color: Colors.text.secondary },
  liveCalcPrice: { fontWeight: "700", color: Colors.success },

  // Payment methods
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.border.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxTick: { fontSize: 12, color: Colors.text.inverse, fontWeight: "700" },
  paymentLabel: { fontSize: FontSize.sm, color: Colors.text.primary, flex: 1 },

  // Template
  capacityRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  templateHint: {
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
    marginTop: -Spacing.xs,
  },

  // Previous routes
  prevRoutesSection: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  prevRoutesTitle: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: Colors.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: Spacing.sm,
  },
  prevRoutesRow: { gap: Spacing.sm, paddingBottom: Spacing.xs },
  prevRouteChip: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minWidth: 140,
    maxWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  prevRouteChipLabel: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.text.primary,
  },
  prevRouteChipSub: {
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
    marginTop: 2,
  },

  vehiclePickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  vehicleChip: {
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: Colors.white,
  },
  vehicleChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  vehicleChipText: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.text.secondary,
  },
  vehicleChipTextActive: { color: Colors.primary },

  // Prohibited items
  chipsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: Spacing.sm,
  },
  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: BorderRadius.full ?? 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.background.secondary,
  },
  presetChipActive: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorLight,
  },
  presetChipText: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.text.secondary,
  },
  presetChipTextActive: {
    color: Colors.error,
  },
  customChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: Spacing.sm,
  },
  customChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: BorderRadius.full ?? 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: Colors.errorLight,
  },
  customChipText: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.error,
  },
  customItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  addItemBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addItemBtnDisabled: {
    backgroundColor: Colors.border.light,
  },

  // Route preview card
  routePreview: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
    padding: Spacing.base,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: Spacing.sm,
  },
  routePreviewRow: { gap: 2 },
  routePreviewCities: {
    fontSize: FontSize.lg,
    fontWeight: "800",
    color: Colors.text.primary,
  },
  routePreviewCountries: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  routePreviewMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  routePreviewChip: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.text.secondary,
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  // Continue button
  continueBtn: { marginTop: Spacing.lg },
});
