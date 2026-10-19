import {
  AlertTriangle,
  BadgeDollarSign,
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  Car,
  CarFront,
  ClipboardList,
  Coins,
  Crown,
  Download,
  Gift,
  LayoutDashboard,
  LifeBuoy,
  MapPin,
  Map as MapIcon,
  Megaphone,
  Route,
  Settings,
  Share2,
  ShieldCheck,
  Star,
  UserPlus,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

export type BadgeKey =
  | "kyc"
  | "tripRequests"
  | "bookings"
  | "reports"
  | "subscriptions";

export interface NavItem {
  readonly label: string;
  readonly href: string;
  readonly icon: LucideIcon;
  readonly badgeKey?: BadgeKey;
  /** Mots supplementaires reconnus par la palette de commandes. */
  readonly keywords?: string;
}

export interface NavGroup {
  readonly label: string;
  readonly items: readonly NavItem[];
}

/* Regroupement par espaces de travail, comme dans le cahier des charges
   (section 26) plutot qu'une longue liste a plat. */
export const navGroups: readonly NavGroup[] = [
  {
    label: "Vue d’ensemble",
    items: [
      { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard, keywords: "accueil statistiques kpi" },
      { label: "Carte des trajets", href: "/trips#carte", icon: MapPin, keywords: "temps réel live carte" },
      { label: "Analyses", href: "/analytics", icon: BarChart3, keywords: "bi rapports croissance rétention" },
    ],
  },
  {
    label: "Utilisateurs et ressources",
    items: [
      { label: "Utilisateurs", href: "/users", icon: Users, keywords: "passagers comptes" },
      { label: "Conducteurs", href: "/users?role=driver", icon: Car, keywords: "chauffeurs véhicules" },
      { label: "Véhicules", href: "/vehicles", icon: CarFront, keywords: "propriétaires plaques voitures motos tricycles" },
      { label: "Validation KYC", href: "/kyc", icon: ShieldCheck, badgeKey: "kyc", keywords: "identité documents" },
    ],
  },
  {
    label: "Exploitation",
    items: [
      { label: "Trajets", href: "/trips", icon: Route, keywords: "covoiturage courses" },
      { label: "Demandes de trajet", href: "/trip-requests", icon: ClipboardList, badgeKey: "tripRequests" },
      { label: "Réservations", href: "/bookings", icon: Calendar, badgeKey: "bookings" },
      { label: "Signalements", href: "/reports", icon: AlertTriangle, badgeKey: "reports", keywords: "sécurité incidents sos" },
      { label: "Zones", href: "/zones", icon: MapIcon, keywords: "géographie communes quartiers kinshasa" },
    ],
  },
  {
    label: "Finances",
    items: [
      { label: "Paiements", href: "/payments", icon: BadgeDollarSign, keywords: "transactions mobile money retraits" },
      { label: "Jetons", href: "/tokens", icon: Coins, keywords: "wallet portefeuille" },
      { label: "Abonnements", href: "/subscriptions", icon: Crown, badgeKey: "subscriptions", keywords: "conducteur financement" },
      { label: "Zwanga Services", href: "/pro-services", icon: Briefcase, keywords: "devis démarches" },
    ],
  },
  {
    label: "Croissance commerciale",
    items: [
      { label: "Promotions", href: "/promotions", icon: Gift, keywords: "codes fidélité marketing" },
      { label: "Parrainage", href: "/referrals", icon: Share2, keywords: "filleuls récompenses" },
      { label: "Agents de terrain", href: "/terrain-agents", icon: Megaphone, keywords: "recrutement crm" },
      { label: "Candidatures agents", href: "/candidatures", icon: UserPlus },
      { label: "Entreprises", href: "/companies", icon: Building2, keywords: "partenaires flottes b2b" },
    ],
  },
  {
    label: "Relation client",
    items: [
      { label: "Support", href: "/support", icon: LifeBuoy, keywords: "tickets réclamations faq" },
      { label: "Évaluations", href: "/evaluations", icon: Star, keywords: "notes avis qualité" },
    ],
  },
  {
    label: "Système",
    items: [
      { label: "Mises à jour", href: "/app-updates", icon: Download, keywords: "version application" },
      { label: "Paramètres", href: "/settings", icon: Settings, keywords: "configuration" },
      { label: "Profil admin", href: "/profile", icon: UserRound, keywords: "mot de passe compte" },
    ],
  },
];

export const marketerGroups: readonly NavGroup[] = [
  {
    label: "Statistiques",
    items: [{ label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Compte",
    items: [
      { label: "Paramètres", href: "/settings", icon: Settings },
      { label: "Profil", href: "/profile", icon: UserRound },
    ],
  },
];

/* Un lien actif doit etre unique: "/users?role=driver" ne doit pas allumer
   aussi "Utilisateurs". */
export const isNavItemActive = (
  item: NavItem,
  pathname: string | null,
  search: string
) => {
  const [rawPath, rawQuery = ""] = item.href.split("#")[0].split("?");
  if (!pathname) return false;
  if (rawPath === "/dashboard") return pathname === "/dashboard";
  const samePath = pathname === rawPath || pathname.startsWith(`${rawPath}/`);
  if (!samePath) return false;
  if (rawPath === "/users") {
    const wantsDriver = rawQuery.includes("role=driver");
    const isDriver = new URLSearchParams(search).get("role") === "driver";
    return wantsDriver === isDriver;
  }
  return true;
};
