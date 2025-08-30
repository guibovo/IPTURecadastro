import { db } from "./db";
import { municipalData, propertyMatches } from "@shared/schema";
import { eq, and, sql, or, ilike } from "drizzle-orm";

interface PropertyData {
  inscricaoImobiliaria?: string;
  numero?: string;
  complemento?: string;
  logradouro?: string;
  bairro?: string;
  usoPredominante?: string;
  areaTerreno?: number;
  areaConstruida?: number;
  numeroPavimentos?: number;
  proprietarioNome?: string;
  proprietarioCpfCnpj?: string;
  latitude?: number;
  longitude?: number;
}

interface MatchCriteria {
  type: string;
  field: string;
  score: number;
  weight: number;
  description: string;
}

interface MatchResult {
  municipalDataId: string;
  score: number;
  reasons: MatchCriteria[];
  municipalData: any;
}

export class AIPropertyMatcher {
  
  // Pesos para diferentes critérios de matching
  private readonly weights = {
    inscricaoImobiliaria: 1.0,    // Match exato = identificação definitiva
    proprietarioCpfCnpj: 0.9,     // CPF/CNPJ é muito confiável
    location: 0.8,                // Localização próxima é forte indicativo
    address: 0.7,                 // Endereço similar
    proprietarioNome: 0.6,        // Nome pode ter variações
    areaTerreno: 0.5,             // Área pode ter pequenas diferenças
    areaConstruida: 0.5,          // Área construída pode variar
    usoPredominante: 0.4,         // Uso pode ter mudado
    numeroPavimentos: 0.3,        // Número de pavimentos
  };

  // Thresholds para diferentes tipos de matching
  private readonly thresholds = {
    autoApply: 0.95,     // Auto-aplicar se score >= 95%
    highConfidence: 0.85, // Alta confiança
    mediumConfidence: 0.65, // Média confiança
    lowConfidence: 0.4,   // Baixa confiança (ainda mostra)
  };

  /**
   * Encontra possíveis matches para uma propriedade
   */
  async findMatches(propertyData: PropertyData, municipio: string): Promise<MatchResult[]> {
    const candidates = await this.getCandidates(propertyData, municipio);
    const matches: MatchResult[] = [];

    for (const candidate of candidates) {
      const matchResult = this.calculateMatch(propertyData, candidate);
      
      if (matchResult.score >= this.thresholds.lowConfidence) {
        matches.push(matchResult);
      }
    }

    // Ordenar por score decrescente
    return matches.sort((a, b) => b.score - a.score);
  }

  /**
   * Busca candidatos potenciais no banco de dados municipal
   */
  private async getCandidates(propertyData: PropertyData, municipio: string) {
    const conditions = [];

    // Buscar por inscrição imobiliária exata
    if (propertyData.inscricaoImobiliaria) {
      conditions.push(
        eq(municipalData.inscricaoImobiliaria, propertyData.inscricaoImobiliaria)
      );
    }

    // Buscar por CPF/CNPJ do proprietário
    if (propertyData.proprietarioCpfCnpj) {
      conditions.push(
        eq(municipalData.proprietarioCpfCnpj, propertyData.proprietarioCpfCnpj)
      );
    }

    // Buscar por endereço similar
    if (propertyData.logradouro && propertyData.numero) {
      conditions.push(
        and(
          ilike(municipalData.logradouro, `%${propertyData.logradouro}%`),
          eq(municipalData.numeroLogradouro, propertyData.numero)
        )
      );
    }

    // Buscar por nome do proprietário similar
    if (propertyData.proprietarioNome && propertyData.proprietarioNome.length > 3) {
      conditions.push(
        ilike(municipalData.proprietarioNome, `%${propertyData.proprietarioNome}%`)
      );
    }

    // Buscar por proximidade geográfica (se houver coordenadas)
    if (propertyData.latitude && propertyData.longitude) {
      // Buscar em um raio de aproximadamente 100 metros
      const radiusKm = 0.1;
      conditions.push(
        sql`
          ST_DWithin(
            ST_SetSRID(ST_MakePoint(${municipalData.longitude}, ${municipalData.latitude}), 4326)::geography,
            ST_SetSRID(ST_MakePoint(${propertyData.longitude}, ${propertyData.latitude}), 4326)::geography,
            ${radiusKm * 1000}
          )
        `
      );
    }

    if (conditions.length === 0) {
      return [];
    }

    return await db
      .select()
      .from(municipalData)
      .where(
        and(
          eq(municipalData.municipio, municipio),
          eq(municipalData.situacao, "ativo"),
          or(...conditions)
        )
      )
      .limit(10); // Limitar a 10 candidatos para performance
  }

  /**
   * Calcula o score de matching entre propriedade e dados municipais
   */
  private calculateMatch(propertyData: PropertyData, municipal: any): MatchResult {
    const reasons: MatchCriteria[] = [];
    let totalScore = 0;
    let totalWeight = 0;

    // 1. Inscrição Imobiliária (match exato)
    if (propertyData.inscricaoImobiliaria && municipal.inscricaoImobiliaria) {
      const isExact = propertyData.inscricaoImobiliaria === municipal.inscricaoImobiliaria;
      const score = isExact ? 1.0 : 0;
      const weight = this.weights.inscricaoImobiliaria;
      
      if (score > 0) {
        reasons.push({
          type: "exact_match",
          field: "inscricaoImobiliaria",
          score,
          weight,
          description: "Inscrição imobiliária idêntica"
        });
      }
      
      totalScore += score * weight;
      totalWeight += weight;
    }

    // 2. CPF/CNPJ do Proprietário
    if (propertyData.proprietarioCpfCnpj && municipal.proprietarioCpfCnpj) {
      const isExact = this.normalizeDocument(propertyData.proprietarioCpfCnpj) === 
                     this.normalizeDocument(municipal.proprietarioCpfCnpj);
      const score = isExact ? 1.0 : 0;
      const weight = this.weights.proprietarioCpfCnpj;
      
      if (score > 0) {
        reasons.push({
          type: "exact_match",
          field: "proprietarioCpfCnpj",
          score,
          weight,
          description: "CPF/CNPJ do proprietário idêntico"
        });
      }
      
      totalScore += score * weight;
      totalWeight += weight;
    }

    // 3. Localização Geográfica
    if (propertyData.latitude && propertyData.longitude && 
        municipal.latitude && municipal.longitude) {
      const distance = this.calculateDistance(
        propertyData.latitude, propertyData.longitude,
        parseFloat(municipal.latitude), parseFloat(municipal.longitude)
      );
      
      // Score decresce com a distância (máximo 100m para score alto)
      const score = Math.max(0, 1 - (distance / 0.1)); // 0.1km = 100m
      const weight = this.weights.location;
      
      if (score > 0.3) {
        reasons.push({
          type: "proximity",
          field: "location",
          score,
          weight,
          description: `Distância: ${Math.round(distance * 1000)}m`
        });
      }
      
      totalScore += score * weight;
      totalWeight += weight;
    }

    // 4. Endereço (logradouro + número)
    if (propertyData.logradouro && propertyData.numero && 
        municipal.logradouro && municipal.numeroLogradouro) {
      const addressScore = this.calculateAddressSimilarity(
        propertyData.logradouro, propertyData.numero,
        municipal.logradouro, municipal.numeroLogradouro
      );
      const weight = this.weights.address;
      
      if (addressScore > 0.5) {
        reasons.push({
          type: "similarity",
          field: "address",
          score: addressScore,
          weight,
          description: `Endereço similar (${Math.round(addressScore * 100)}%)`
        });
      }
      
      totalScore += addressScore * weight;
      totalWeight += weight;
    }

    // 5. Nome do Proprietário
    if (propertyData.proprietarioNome && municipal.proprietarioNome) {
      const nameScore = this.calculateNameSimilarity(
        propertyData.proprietarioNome, 
        municipal.proprietarioNome
      );
      const weight = this.weights.proprietarioNome;
      
      if (nameScore > 0.6) {
        reasons.push({
          type: "similarity",
          field: "proprietarioNome",
          score: nameScore,
          weight,
          description: `Nome similar (${Math.round(nameScore * 100)}%)`
        });
      }
      
      totalScore += nameScore * weight;
      totalWeight += weight;
    }

    // 6. Área do Terreno
    if (propertyData.areaTerreno && municipal.areaTerreno) {
      const areaScore = this.calculateAreaSimilarity(
        propertyData.areaTerreno, 
        parseFloat(municipal.areaTerreno)
      );
      const weight = this.weights.areaTerreno;
      
      if (areaScore > 0.7) {
        reasons.push({
          type: "similarity",
          field: "areaTerreno",
          score: areaScore,
          weight,
          description: `Área do terreno similar (${Math.round(areaScore * 100)}%)`
        });
      }
      
      totalScore += areaScore * weight;
      totalWeight += weight;
    }

    // 7. Área Construída
    if (propertyData.areaConstruida && municipal.areaConstruida) {
      const areaScore = this.calculateAreaSimilarity(
        propertyData.areaConstruida, 
        parseFloat(municipal.areaConstruida)
      );
      const weight = this.weights.areaConstruida;
      
      if (areaScore > 0.7) {
        reasons.push({
          type: "similarity",
          field: "areaConstruida",
          score: areaScore,
          weight,
          description: `Área construída similar (${Math.round(areaScore * 100)}%)`
        });
      }
      
      totalScore += areaScore * weight;
      totalWeight += weight;
    }

    // 8. Uso Predominante
    if (propertyData.usoPredominante && municipal.usoPredominante) {
      const isSame = this.normalizeUsage(propertyData.usoPredominante) === 
                    this.normalizeUsage(municipal.usoPredominante);
      const score = isSame ? 1.0 : 0;
      const weight = this.weights.usoPredominante;
      
      if (score > 0) {
        reasons.push({
          type: "exact_match",
          field: "usoPredominante",
          score,
          weight,
          description: "Uso predominante idêntico"
        });
      }
      
      totalScore += score * weight;
      totalWeight += weight;
    }

    // Calcular score final normalizado
    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;

    return {
      municipalDataId: municipal.id,
      score: finalScore,
      reasons,
      municipalData: municipal
    };
  }

  // Funções auxiliares de comparação

  private normalizeDocument(doc: string): string {
    return doc.replace(/[^\d]/g, '');
  }

  private normalizeUsage(usage: string): string {
    return usage.toLowerCase().trim();
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Raio da Terra em km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  private calculateAddressSimilarity(street1: string, num1: string, street2: string, num2: string): number {
    const streetSim = this.calculateStringSimilarity(street1, street2);
    const numMatch = num1 === num2 ? 1 : 0;
    return (streetSim * 0.7) + (numMatch * 0.3);
  }

  private calculateNameSimilarity(name1: string, name2: string): number {
    return this.calculateStringSimilarity(name1, name2);
  }

  private calculateAreaSimilarity(area1: number, area2: number): number {
    const diff = Math.abs(area1 - area2);
    const max = Math.max(area1, area2);
    return Math.max(0, 1 - (diff / max));
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
    const s1 = normalize(str1);
    const s2 = normalize(str2);
    
    if (s1 === s2) return 1;
    
    // Algoritmo simples de similaridade baseado em caracteres comuns
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1;
    
    const matches = this.getMatchingCharacters(shorter, longer);
    return matches / longer.length;
  }

  private getMatchingCharacters(shorter: string, longer: string): number {
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) {
        matches++;
      }
    }
    return matches;
  }

  /**
   * Salva um match encontrado no banco de dados
   */
  async saveMatch(
    collectionId: string,
    municipalDataId: string,
    score: number,
    reasons: MatchCriteria[],
    autoApply: boolean = false
  ) {
    const shouldAutoApply = score >= this.thresholds.autoApply && autoApply;
    
    return await db.insert(propertyMatches).values({
      collectionId,
      municipalDataId,
      matchScore: score.toString(),
      matchReasons: reasons,
      status: shouldAutoApply ? "auto_applied" : "pending",
      autoApplied: shouldAutoApply,
    });
  }

  /**
   * Determina o nível de confiança baseado no score
   */
  getConfidenceLevel(score: number): string {
    if (score >= this.thresholds.autoApply) return "Muito Alta";
    if (score >= this.thresholds.highConfidence) return "Alta";
    if (score >= this.thresholds.mediumConfidence) return "Média";
    if (score >= this.thresholds.lowConfidence) return "Baixa";
    return "Muito Baixa";
  }
}

export const aiPropertyMatcher = new AIPropertyMatcher();