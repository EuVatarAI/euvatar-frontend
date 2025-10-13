/**
 * Sanitiza o nome do contexto para o formato padronizado
 * - Converte para minúsculas
 * - Substitui espaços por underscore
 * - Remove caracteres especiais
 * - Remove underscores duplicados e nas pontas
 */
export function sanitizeContextName(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}
