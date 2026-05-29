export interface ModuleCard {
  id: string;
  title: string;
  icon: string;
  route: string;
  description: string;
  tags: string[];
  statA: { icon: string; label: string; color: string };
  statB: { icon: string; label: string; color: string };
  count: string;
  countLabel: string;
  gradientA: string;
  gradientB: string;
  orbColor: string;
  dotA: string;
  dotB: string;
}
