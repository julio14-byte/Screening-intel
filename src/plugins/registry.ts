import config from "@/config";
import { stripePlugin } from "./stripe";

const INSTALLED_PLUGINS = [stripePlugin];

export function getInstalledPlugins() {
  return INSTALLED_PLUGINS;
}

export function isPluginEnabled(plugin: { featureKey?: string }) {
  if (!plugin?.featureKey) return true;
  return Boolean(
    config.features[plugin.featureKey as keyof typeof config.features]
  );
}
