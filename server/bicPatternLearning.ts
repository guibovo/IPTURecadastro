import { db } from "./db";
import { municipalData, propertyCollections, missions } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

interface BICPattern {
  municipio: string;
  patterns: {
    addressFormats: string[];
    zipCodePatterns: string[];
    propertyCodeFormats: string[];
    ownerNamePatterns: string[];
    constructionYearRanges: number[];
    areaSizeRanges: number[];
    commonPropertyTypes: string[];
    neighborhoodPatterns: string[];
  };
  confidence: number;
  lastUpdated: Date;
  sampleSize: number;
}

interface PropertyIdentificationResult {
  confidence: number;
  matches: {
    addressScore: number;
    ownerScore: number;
    propertyCodeScore: number;
    locationScore: number;
  };
  suggestions: {
    field: string;
    suggestedValue: string;
    reason: string;
    confidence: number;
  }[];
  potentialMatches: {
    bicId: string;
    overallScore: number;
    matchedFields: string[];
  }[];
}

export class BICPatternLearningService {
  private patterns: Map<string, BICPattern> = new Map();

  constructor() {
    this.loadExistingPatterns();
  }

  // Carrega padrões existentes do banco de dados
  private async loadExistingPatterns(): Promise<void> {
    try {
      // Buscar padrões salvos no banco (implementar tabela de padrões se necessário)
      console.log("Carregando padrões BIC existentes...");
    } catch (error) {
      console.error("Erro ao carregar padrões BIC:", error);
    }
  }

  // Analisa dados municipais para identificar padrões
  async analyzeAndLearnPatterns(municipio: string): Promise<BICPattern> {
    try {
      console.log(`Analisando padrões BIC para município: ${municipio}`);

      // Buscar todos os dados municipais do município
      const municipalRecords = await db
        .select()
        .from(municipalData)
        .where(eq(municipalData.municipio, municipio));

      if (municipalRecords.length === 0) {
        throw new Error(`Nenhum dado municipal encontrado para ${municipio}`);
      }

      // Analisar padrões de endereço
      const addressFormats = this.extractAddressPatterns(municipalRecords);
      
      // Analisar padrões de CEP
      const zipCodePatterns = this.extractZipCodePatterns(municipalRecords);
      
      // Analisar padrões de código de propriedade
      const propertyCodeFormats = this.extractPropertyCodePatterns(municipalRecords);
      
      // Analisar padrões de nomes de proprietários
      const ownerNamePatterns = this.extractOwnerNamePatterns(municipalRecords);
      
      // Analisar faixas de ano de construção
      const constructionYearRanges = this.extractConstructionYearRanges(municipalRecords);
      
      // Analisar faixas de área
      const areaSizeRanges = this.extractAreaSizeRanges(municipalRecords);
      
      // Analisar tipos comuns de propriedade
      const commonPropertyTypes = this.extractCommonPropertyTypes(municipalRecords);
      
      // Analisar padrões de bairro
      const neighborhoodPatterns = this.extractNeighborhoodPatterns(municipalRecords);

      const pattern: BICPattern = {
        municipio,
        patterns: {
          addressFormats,
          zipCodePatterns,
          propertyCodeFormats,
          ownerNamePatterns,
          constructionYearRanges,
          areaSizeRanges,
          commonPropertyTypes,
          neighborhoodPatterns,
        },
        confidence: this.calculatePatternConfidence(municipalRecords.length),
        lastUpdated: new Date(),
        sampleSize: municipalRecords.length,
      };

      // Salvar padrões aprendidos
      this.patterns.set(municipio, pattern);
      await this.savePatternToDatabase(pattern);

      console.log(`Padrões BIC aprendidos para ${municipio}:`, {
        sampleSize: pattern.sampleSize,
        confidence: pattern.confidence,
        addressFormats: pattern.patterns.addressFormats.length,
        propertyTypes: pattern.patterns.commonPropertyTypes.length,
      });

      return pattern;
    } catch (error) {
      console.error(`Erro ao analisar padrões BIC para ${municipio}:`, error);
      throw error;
    }
  }

  // Identifica rapidamente propriedades usando padrões aprendidos
  async identifyProperty(municipio: string, propertyData: any): Promise<PropertyIdentificationResult> {
    const pattern = this.patterns.get(municipio);
    if (!pattern) {
      throw new Error(`Padrões não encontrados para município ${municipio}. Execute a análise primeiro.`);
    }

    // Buscar dados municipais do município
    const municipalRecords = await db
      .select()
      .from(municipalData)
      .where(eq(municipalData.municipio, municipio));

    const suggestions: any[] = [];
    const potentialMatches: any[] = [];

    // Análise de endereço
    const addressScore = this.calculateAddressScore(propertyData.endereco, pattern.patterns.addressFormats);
    
    // Análise de proprietário
    const ownerScore = this.calculateOwnerScore(propertyData.proprietario, pattern.patterns.ownerNamePatterns);
    
    // Análise de código de propriedade
    const propertyCodeScore = this.calculatePropertyCodeScore(propertyData.codigoPropriedade, pattern.patterns.propertyCodeFormats);
    
    // Análise de localização
    const locationScore = this.calculateLocationScore(propertyData, pattern.patterns.neighborhoodPatterns);

    // Buscar correspondências potenciais nos dados municipais
    for (const record of municipalRecords) {
      const matchScore = this.calculateOverallMatchScore(propertyData, record, pattern);
      if (matchScore > 0.7) { // Threshold de confiança
        potentialMatches.push({
          bicId: record.id,
          overallScore: matchScore,
          matchedFields: this.getMatchedFields(propertyData, record),
        });
      }
    }

    // Gerar sugestões baseadas nos padrões
    suggestions.push(...this.generateSuggestions(propertyData, pattern));

    const result: PropertyIdentificationResult = {
      confidence: (addressScore + ownerScore + propertyCodeScore + locationScore) / 4,
      matches: {
        addressScore,
        ownerScore,
        propertyCodeScore,
        locationScore,
      },
      suggestions,
      potentialMatches: potentialMatches.sort((a, b) => b.overallScore - a.overallScore).slice(0, 5),
    };

    return result;
  }

  // Fornece sugestões para melhorar o cadastro
  async provideCadastroSuggestions(municipio: string, partialData: any): Promise<any[]> {
    const pattern = this.patterns.get(municipio);
    if (!pattern) {
      throw new Error(`Padrões não encontrados para município ${municipio}`);
    }

    const suggestions = [];

    // Sugestões de endereço baseadas nos padrões
    if (!partialData.endereco || partialData.endereco.length < 10) {
      suggestions.push({
        field: 'endereco',
        type: 'format_suggestion',
        message: 'Formato de endereço recomendado para este município',
        examples: pattern.patterns.addressFormats.slice(0, 3),
        priority: 'high',
      });
    }

    // Sugestões de CEP
    if (!partialData.cep || !this.validateZipCode(partialData.cep, pattern.patterns.zipCodePatterns)) {
      suggestions.push({
        field: 'cep',
        type: 'validation_error',
        message: 'CEP não segue o padrão comum deste município',
        expectedPatterns: pattern.patterns.zipCodePatterns,
        priority: 'medium',
      });
    }

    // Sugestões de tipo de propriedade
    if (!partialData.tipoPropriedade) {
      suggestions.push({
        field: 'tipoPropriedade',
        type: 'options_suggestion',
        message: 'Tipos de propriedade mais comuns neste município',
        options: pattern.patterns.commonPropertyTypes.slice(0, 5),
        priority: 'medium',
      });
    }

    // Sugestões de ano de construção
    if (partialData.anoConstrucao && !this.validateConstructionYear(partialData.anoConstrucao, pattern.patterns.constructionYearRanges)) {
      suggestions.push({
        field: 'anoConstrucao',
        type: 'validation_warning',
        message: 'Ano de construção fora do padrão comum para este município',
        expectedRange: pattern.patterns.constructionYearRanges,
        priority: 'low',
      });
    }

    return suggestions;
  }

  // Métodos auxiliares para análise de padrões

  private extractAddressPatterns(records: any[]): string[] {
    const patterns = new Set<string>();
    
    records.forEach(record => {
      if (record.endereco) {
        // Extrair padrão de endereço (ex: "Rua [NOME], [NUMERO]")
        const pattern = this.generalizeAddress(record.endereco);
        patterns.add(pattern);
      }
    });

    return Array.from(patterns);
  }

  private extractZipCodePatterns(records: any[]): string[] {
    const patterns = new Set<string>();
    
    records.forEach(record => {
      if (record.cep) {
        // Extrair padrão de CEP (ex: "12345-678" -> "12345-XXX")
        const pattern = record.cep.substring(0, 5) + '-XXX';
        patterns.add(pattern);
      }
    });

    return Array.from(patterns);
  }

  private extractPropertyCodePatterns(records: any[]): string[] {
    const patterns = new Set<string>();
    
    records.forEach(record => {
      if (record.codigoPropriedade) {
        // Analisar padrão do código (ex: letras, números, separadores)
        const pattern = this.generalizePropertyCode(record.codigoPropriedade);
        patterns.add(pattern);
      }
    });

    return Array.from(patterns);
  }

  private extractOwnerNamePatterns(records: any[]): string[] {
    const patterns = new Set<string>();
    
    records.forEach(record => {
      if (record.proprietario) {
        // Analisar padrões de nome (ex: quantidade de palavras, prefixos comuns)
        const pattern = this.analyzeNamePattern(record.proprietario);
        patterns.add(pattern);
      }
    });

    return Array.from(patterns);
  }

  private extractConstructionYearRanges(records: any[]): number[] {
    const years = records
      .map(r => r.anoConstrucao)
      .filter(year => year && year > 1800 && year <= new Date().getFullYear())
      .sort((a, b) => a - b);

    if (years.length === 0) return [];

    return [
      Math.min(...years),
      Math.max(...years),
      this.calculatePercentile(years, 25),
      this.calculatePercentile(years, 75),
    ];
  }

  private extractAreaSizeRanges(records: any[]): number[] {
    const areas = records
      .map(r => r.areaTerreno || r.areaConstruida)
      .filter(area => area && area > 0)
      .sort((a, b) => a - b);

    if (areas.length === 0) return [];

    return [
      Math.min(...areas),
      Math.max(...areas),
      this.calculatePercentile(areas, 25),
      this.calculatePercentile(areas, 75),
    ];
  }

  private extractCommonPropertyTypes(records: any[]): string[] {
    const typeCount = new Map<string, number>();
    
    records.forEach(record => {
      if (record.tipoPropriedade) {
        const count = typeCount.get(record.tipoPropriedade) || 0;
        typeCount.set(record.tipoPropriedade, count + 1);
      }
    });

    return Array.from(typeCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([type]) => type);
  }

  private extractNeighborhoodPatterns(records: any[]): string[] {
    const neighborhoods = new Set<string>();
    
    records.forEach(record => {
      if (record.bairro) {
        neighborhoods.add(record.bairro.toLowerCase().trim());
      }
    });

    return Array.from(neighborhoods);
  }

  // Métodos de pontuação e análise

  private calculateAddressScore(address: string, patterns: string[]): number {
    if (!address) return 0;
    
    for (const pattern of patterns) {
      if (this.matchesAddressPattern(address, pattern)) {
        return 0.9;
      }
    }
    
    return 0.3;
  }

  private calculateOwnerScore(owner: string, patterns: string[]): number {
    if (!owner) return 0;
    
    const ownerPattern = this.analyzeNamePattern(owner);
    return patterns.includes(ownerPattern) ? 0.8 : 0.4;
  }

  private calculatePropertyCodeScore(code: string, patterns: string[]): number {
    if (!code) return 0;
    
    const codePattern = this.generalizePropertyCode(code);
    return patterns.includes(codePattern) ? 0.9 : 0.2;
  }

  private calculateLocationScore(propertyData: any, neighborhoodPatterns: string[]): number {
    if (!propertyData.bairro) return 0;
    
    const neighborhood = propertyData.bairro.toLowerCase().trim();
    return neighborhoodPatterns.includes(neighborhood) ? 1.0 : 0.1;
  }

  private calculateOverallMatchScore(propertyData: any, bicRecord: any, pattern: BICPattern): number {
    let score = 0;
    let factors = 0;

    // Comparar endereços
    if (propertyData.endereco && bicRecord.endereco) {
      score += this.compareStrings(propertyData.endereco, bicRecord.endereco) * 0.3;
      factors += 0.3;
    }

    // Comparar proprietários
    if (propertyData.proprietario && bicRecord.proprietario) {
      score += this.compareStrings(propertyData.proprietario, bicRecord.proprietario) * 0.25;
      factors += 0.25;
    }

    // Comparar códigos
    if (propertyData.codigoPropriedade && bicRecord.codigoPropriedade) {
      score += this.compareStrings(propertyData.codigoPropriedade, bicRecord.codigoPropriedade) * 0.2;
      factors += 0.2;
    }

    // Comparar bairros
    if (propertyData.bairro && bicRecord.bairro) {
      score += this.compareStrings(propertyData.bairro, bicRecord.bairro) * 0.15;
      factors += 0.15;
    }

    // Comparar CEPs
    if (propertyData.cep && bicRecord.cep) {
      score += this.compareStrings(propertyData.cep, bicRecord.cep) * 0.1;
      factors += 0.1;
    }

    return factors > 0 ? score / factors : 0;
  }

  // Métodos auxiliares

  private generalizeAddress(address: string): string {
    return address
      .replace(/\d+/g, '[NUM]')
      .replace(/\b[A-Z][a-z]+\b/g, '[WORD]')
      .trim();
  }

  private generalizePropertyCode(code: string): string {
    return code
      .replace(/\d/g, 'N')
      .replace(/[A-Za-z]/g, 'L');
  }

  private analyzeNamePattern(name: string): string {
    const words = name.trim().split(/\s+/);
    return `${words.length}_words`;
  }

  private calculatePercentile(sortedArray: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedArray.length - 1);
    return sortedArray[Math.round(index)];
  }

  private calculatePatternConfidence(sampleSize: number): number {
    if (sampleSize < 10) return 0.3;
    if (sampleSize < 50) return 0.6;
    if (sampleSize < 200) return 0.8;
    return 0.95;
  }

  private compareStrings(str1: string, str2: string): number {
    // Implementação simples de similaridade de strings
    const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
    const a = normalize(str1);
    const b = normalize(str2);
    
    if (a === b) return 1.0;
    
    // Distância de Levenshtein simplificada
    const maxLength = Math.max(a.length, b.length);
    if (maxLength === 0) return 1.0;
    
    const distance = this.levenshteinDistance(a, b);
    return 1 - (distance / maxLength);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i += 1) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j += 1) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator, // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private matchesAddressPattern(address: string, pattern: string): boolean {
    const generalizedAddress = this.generalizeAddress(address);
    return generalizedAddress === pattern;
  }

  private validateZipCode(zipCode: string, patterns: string[]): boolean {
    const generalizedZip = zipCode.substring(0, 5) + '-XXX';
    return patterns.includes(generalizedZip);
  }

  private validateConstructionYear(year: number, ranges: number[]): boolean {
    if (ranges.length < 2) return true;
    return year >= ranges[0] && year <= ranges[1];
  }

  private getMatchedFields(propertyData: any, bicRecord: any): string[] {
    const matched = [];
    
    if (this.compareStrings(propertyData.endereco || '', bicRecord.endereco || '') > 0.8) {
      matched.push('endereco');
    }
    if (this.compareStrings(propertyData.proprietario || '', bicRecord.proprietario || '') > 0.8) {
      matched.push('proprietario');
    }
    if (this.compareStrings(propertyData.codigoPropriedade || '', bicRecord.codigoPropriedade || '') > 0.8) {
      matched.push('codigoPropriedade');
    }
    
    return matched;
  }

  private generateSuggestions(propertyData: any, pattern: BICPattern): any[] {
    const suggestions = [];

    // Sugestão de tipo de propriedade baseada nos mais comuns
    if (!propertyData.tipoPropriedade && pattern.patterns.commonPropertyTypes.length > 0) {
      suggestions.push({
        field: 'tipoPropriedade',
        suggestedValue: pattern.patterns.commonPropertyTypes[0],
        reason: 'Tipo mais comum neste município',
        confidence: 0.7,
      });
    }

    // Sugestão de formato de endereço
    if (propertyData.endereco && pattern.patterns.addressFormats.length > 0) {
      const currentPattern = this.generalizeAddress(propertyData.endereco);
      if (!pattern.patterns.addressFormats.includes(currentPattern)) {
        suggestions.push({
          field: 'endereco',
          suggestedValue: 'Revisar formato do endereço',
          reason: 'Formato não usual para este município',
          confidence: 0.6,
        });
      }
    }

    return suggestions;
  }

  private async savePatternToDatabase(pattern: BICPattern): Promise<void> {
    // Implementar salvamento dos padrões no banco de dados
    // Por enquanto apenas log
    console.log(`Salvando padrões BIC para ${pattern.municipio}`);
  }

  // Método público para obter padrões
  getPatternForMunicipality(municipio: string): BICPattern | undefined {
    return this.patterns.get(municipio);
  }

  // Método para listar todos os municípios com padrões aprendidos
  getLearnedMunicipalities(): string[] {
    return Array.from(this.patterns.keys());
  }
}

// Instância singleton do serviço
export const bicPatternLearningService = new BICPatternLearningService();