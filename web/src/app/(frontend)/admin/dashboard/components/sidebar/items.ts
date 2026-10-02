import {
  ChartColumnIncreasing,
  Users,
  ShieldUser
} from "lucide-react";

const baseUrl = '/admin/dashboard';

export const items = [
  {
    title: "Início",
    url: baseUrl,
    icon: ChartColumnIncreasing,
  },
  {
    marginTop: true,
    title: "Usuários",
    url: `${baseUrl}/users`,
    icon: Users,
  },
  {
    title: "Admins",
    url: `${baseUrl}/admins`,
    icon: ShieldUser,
  },
]
