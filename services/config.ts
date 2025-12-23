
import { AppFeatureFlags } from "../types";

/**
 * CONFIGURAÇÃO GLOBAL DE FUNCIONALIDADES (FEATURE FLAGS)
 * Centralize aqui o que está ativo no sistema piloto.
 */
export const getFeatureFlags = (): AppFeatureFlags => {
    return {
        // Integração com APIs de Terceiros (Desativadas no Piloto)
        feature_whatsapp_enabled: false,
        feature_email_enabled: false,
        feature_serasa_enabled: false,
        feature_banking_enabled: false
    };
};

/**
 * Determina se um recurso deve operar em modo SIMULADO ou REAL
 */
export const isFeatureActive = (flag: keyof AppFeatureFlags): boolean => {
    return getFeatureFlags()[flag];
};
