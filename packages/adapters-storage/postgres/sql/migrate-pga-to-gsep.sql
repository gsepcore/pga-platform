-- Migration: Rename pga_ tables to gsep_
-- Run this ONCE on existing databases to migrate from PGA to GSEP branding.
-- Safe to run multiple times (uses IF EXISTS).
--
-- @author Luis Alfredo Velasquez Duran
-- @since 2026-03-22

BEGIN;

ALTER TABLE IF EXISTS pga_genomes RENAME TO gsep_genomes;
ALTER TABLE IF EXISTS pga_alleles RENAME TO gsep_alleles;
ALTER TABLE IF EXISTS pga_user_dna RENAME TO gsep_user_dna;
ALTER TABLE IF EXISTS pga_interactions RENAME TO gsep_interactions;
ALTER TABLE IF EXISTS pga_mutations RENAME TO gsep_mutations;
ALTER TABLE IF EXISTS pga_feedback RENAME TO gsep_feedback;
ALTER TABLE IF EXISTS pga_analytics RENAME TO gsep_analytics;
ALTER TABLE IF EXISTS pga_gene_registry RENAME TO gsep_gene_registry;
ALTER TABLE IF EXISTS pga_calibration_history RENAME TO gsep_calibration_history;

-- Rename indexes (PostgreSQL requires explicit ALTER INDEX)
ALTER INDEX IF EXISTS idx_genomes_name RENAME TO idx_gsep_genomes_name;
ALTER INDEX IF EXISTS idx_genomes_family RENAME TO idx_gsep_genomes_family;
ALTER INDEX IF EXISTS idx_alleles_genome RENAME TO idx_gsep_alleles_genome;
ALTER INDEX IF EXISTS idx_alleles_active RENAME TO idx_gsep_alleles_active;
ALTER INDEX IF EXISTS idx_alleles_fitness RENAME TO idx_gsep_alleles_fitness;
ALTER INDEX IF EXISTS idx_user_dna_genome RENAME TO idx_gsep_user_dna_genome;
ALTER INDEX IF EXISTS idx_user_dna_evolved RENAME TO idx_gsep_user_dna_evolved;
ALTER INDEX IF EXISTS idx_interactions_genome RENAME TO idx_gsep_interactions_genome;
ALTER INDEX IF EXISTS idx_interactions_user RENAME TO idx_gsep_interactions_user;
ALTER INDEX IF EXISTS idx_mutations_genome RENAME TO idx_gsep_mutations_genome;
ALTER INDEX IF EXISTS idx_mutations_gene RENAME TO idx_gsep_mutations_gene;
ALTER INDEX IF EXISTS idx_mutations_deployed RENAME TO idx_gsep_mutations_deployed;
ALTER INDEX IF EXISTS idx_feedback_genome RENAME TO idx_gsep_feedback_genome;
ALTER INDEX IF EXISTS idx_feedback_user RENAME TO idx_gsep_feedback_user;
ALTER INDEX IF EXISTS idx_analytics_genome RENAME TO idx_gsep_analytics_genome;
ALTER INDEX IF EXISTS idx_gene_registry_family RENAME TO idx_gsep_gene_registry_family;
ALTER INDEX IF EXISTS idx_gene_registry_gene RENAME TO idx_gsep_gene_registry_gene;
ALTER INDEX IF EXISTS idx_calibration_context RENAME TO idx_gsep_calibration_context;
ALTER INDEX IF EXISTS idx_calibration_layer RENAME TO idx_gsep_calibration_layer;

COMMIT;
