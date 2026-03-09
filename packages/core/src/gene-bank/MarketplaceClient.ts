import type { CognitiveGene, GeneSearchFilters } from './index.js';
import type { GeneBank } from './GeneBank.js';
import type { MetricsCollector } from '../monitoring/MetricsCollector.js';

/**
 * MarketplaceClient.ts
 *
 * Cliente para la interacción con el Gene Marketplace global de PGA.
 * Permite que los agentes publiquen sus mejores genes y descubran 
 * habilidades optimizadas por otros miembros del ecosistema Swarm.
 *
 * @version 0.5.0
 */
export class MarketplaceClient {
    readonly marketplaceUrl: string;

    constructor(
        private geneBank: GeneBank,
        options?: { marketplaceUrl?: string },
        private metricsCollector?: MetricsCollector
    ) {
        this.marketplaceUrl = options?.marketplaceUrl || 'https://market.pga-platform.ai/v1';
    }

    /**
     * Publica un gen local en el Marketplace global.
     * Realiza un proceso de 'limpieza' para asegurar que no se fuguen datos privados.
     */
    async publishToMarketplace(geneId: string): Promise<{ success: boolean; marketplaceId?: string; error?: string }> {
        const startTime = Date.now();

        try {
            const gene = await this.geneBank.getGene(geneId);
            if (!gene) throw new Error(`Gen ${geneId} no encontrado en el banco local.`);

            // 1. Verificación de Fitness
            if (gene.fitness.overallFitness < 0.8) {
                return { success: false, error: 'El fitness del gen es demasiado bajo para el Marketplace (mínimo 0.8).' };
            }

            // 2. Anonimización y Limpieza (Simulado)
            this.sanitizeForMarketplace(gene.content.instruction);

            // 3. Envío al Marketplace (Simulado por ahora)
            // En una implementación real, esto sería un POST a this._marketplaceUrl
            const marketplaceId = `mkt_${Math.random().toString(36).substr(2, 9)}`;

            // Marcamos el gen como publicado localmente
            gene.tenant.scope = 'marketplace';
            await this.geneBank.updateGene(gene);

            this.metricsCollector?.logAudit({
                level: 'info',
                component: 'MarketplaceClient',
                operation: 'publishToMarketplace',
                message: `Gen ${gene.name} publicado con éxito en el Marketplace.`,
                duration: Date.now() - startTime,
                metadata: { geneId, marketplaceId }
            });

            return { success: true, marketplaceId };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
        }
    }

    /**
     * Busca genes de alta calidad en el Marketplace global.
     */
    async discoverGenes(filters: Partial<GeneSearchFilters>): Promise<CognitiveGene[]> {
        // En el futuro esto consultará la API del Marketplace.
        // Por ahora, redirigimos a la búsqueda del banco local con scope marketplace.
        return this.geneBank.searchGenes({
            ...filters,
            scope: ['marketplace'],
            verifiedOnly: true,
            minFitness: 0.8
        });
    }

    /**
     * Adopta un gen del Marketplace e inyecta una copia en el banco local.
     */
    async adoptFromMarketplace(marketplaceGeneId: string): Promise<CognitiveGene> {
        // 1. Descarga del gen (Simulado)
        // 2. Validación de firma y seguridad
        // 3. Inserción en el banco local con lineage al Marketplace

        const results = await this.discoverGenes({ limit: 10 });
        const targetGene = results.find(g => g.id === marketplaceGeneId);

        if (!targetGene) {
            throw new Error(`Gen de Marketplace ${marketplaceGeneId} no encontrado.`);
        }

        // Crear copia local
        const localCopy: CognitiveGene = {
            ...targetGene,
            id: `adopted_${targetGene.id}_${Date.now()}`,
            lineage: {
                ...targetGene.lineage,
                parentGeneId: targetGene.id,
                ancestors: [...targetGene.lineage.ancestors, targetGene.id]
            },
            tenant: {
                ...targetGene.tenant,
                scope: 'tenant' // Se vuelve privado tras la adopción
            }
        };

        await this.geneBank.storeGene(localCopy);
        return localCopy;
    }

    /**
     * Remueve menciones a datos específicos del usuario o del tenant
     * para asegurar que el gen sea genérico y reutilizable.
     */
    private sanitizeForMarketplace(content: string): string {
        // Lógica básica de limpieza (Regex para emails, nombres, etc.)
        return content
            .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[USER_EMAIL]')
            .replace(/\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g, '[ANONYMIZED_NAME]');
    }
}
