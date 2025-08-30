interface PropertySuggestion {
  field: string;
  value: any;
  confidence: number;
  reason: string;
}

interface LocationBasedSuggestion {
  usoPredominante?: string;
  padraoConstrutivo?: string;
  numeroPavimentos?: number;
  areaMedia?: number;
}

interface PropertyHistory {
  inscricaoImobiliaria: string;
  numero?: string;
  usoPredominante: string;
  areaTerreno?: number;
  areaConstruida?: number;
  numeroPavimentos?: number;
  padraoConstrutivo?: string;
  anoConstrucao?: number;
  agua: boolean;
  esgoto: boolean;
  energia: boolean;
  iluminacaoPublica: boolean;
  coletaLixo: boolean;
  meioFio: boolean;
  latitude: number;
  longitude: number;
  timestamp: Date;
}

export class SmartAutofillService {
  private propertyHistory: PropertyHistory[] = [];

  constructor() {
    this.loadPropertyHistory();
  }

  // Carrega histórico de propriedades do IndexedDB
  private async loadPropertyHistory() {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['propertyHistory'], 'readonly');
      const store = transaction.objectStore('propertyHistory');
      const request = store.getAll();
      
      request.onsuccess = () => {
        this.propertyHistory = request.result || [];
      };
    } catch (error) {
      console.warn('Não foi possível carregar histórico de propriedades:', error);
    }
  }

  // Salva nova propriedade no histórico
  async savePropertyToHistory(propertyData: any, location: { latitude: number; longitude: number }) {
    const historyEntry: PropertyHistory = {
      ...propertyData,
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: new Date()
    };

    try {
      const db = await this.openDB();
      const transaction = db.transaction(['propertyHistory'], 'readwrite');
      const store = transaction.objectStore('propertyHistory');
      await store.add(historyEntry);
      
      this.propertyHistory.push(historyEntry);
      
      // Manter apenas os últimos 1000 registros
      if (this.propertyHistory.length > 1000) {
        this.propertyHistory = this.propertyHistory.slice(-1000);
      }
    } catch (error) {
      console.warn('Erro ao salvar no histórico:', error);
    }
  }

  // Gera sugestões baseadas na localização atual
  generateLocationBasedSuggestions(currentLocation: { latitude: number; longitude: number }): PropertySuggestion[] {
    const suggestions: PropertySuggestion[] = [];
    
    // Encontrar propriedades próximas (raio de 500m)
    const nearbyProperties = this.propertyHistory.filter(property => {
      const distance = this.calculateDistance(
        currentLocation.latitude, currentLocation.longitude,
        property.latitude, property.longitude
      );
      return distance <= 0.5; // 500 metros
    });

    if (nearbyProperties.length === 0) return suggestions;

    // Análise do uso predominante na área
    const usoStats = this.analyzeField(nearbyProperties, 'usoPredominante');
    if (usoStats.mostCommon) {
      suggestions.push({
        field: 'usoPredominante',
        value: usoStats.mostCommon,
        confidence: usoStats.confidence,
        reason: `${usoStats.percentage}% das propriedades próximas são ${usoStats.mostCommon}`
      });
    }

    // Análise do padrão construtivo
    const padraoStats = this.analyzeField(nearbyProperties, 'padraoConstrutivo');
    if (padraoStats.mostCommon) {
      suggestions.push({
        field: 'padraoConstrutivo',
        value: padraoStats.mostCommon,
        confidence: padraoStats.confidence,
        reason: `Padrão mais comum na região: ${padraoStats.mostCommon}`
      });
    }

    // Análise do número de pavimentos
    const pavimentosStats = this.analyzeField(nearbyProperties, 'numeroPavimentos');
    if (pavimentosStats.mostCommon) {
      suggestions.push({
        field: 'numeroPavimentos',
        value: pavimentosStats.mostCommon,
        confidence: pavimentosStats.confidence,
        reason: `${pavimentosStats.percentage}% das propriedades próximas têm ${pavimentosStats.mostCommon} pavimento(s)`
      });
    }

    // Análise de infraestrutura (serviços públicos)
    const infraServices = ['agua', 'esgoto', 'energia', 'iluminacaoPublica', 'coletaLixo', 'meioFio'];
    infraServices.forEach(service => {
      const serviceStats = this.analyzeField(nearbyProperties, service);
      if (serviceStats.confidence > 0.7) {
        suggestions.push({
          field: service,
          value: serviceStats.mostCommon,
          confidence: serviceStats.confidence,
          reason: `${serviceStats.percentage}% das propriedades próximas ${serviceStats.mostCommon ? 'têm' : 'não têm'} ${this.getServiceName(service)}`
        });
      }
    });

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  // Gera sugestões baseadas em padrões de propriedades similares
  generateSimilarPropertySuggestions(currentData: any): PropertySuggestion[] {
    const suggestions: PropertySuggestion[] = [];
    
    // Buscar propriedades com características similares
    const similarProperties = this.propertyHistory.filter(property => {
      let similarity = 0;
      let factors = 0;
      
      if (currentData.usoPredominante && property.usoPredominante === currentData.usoPredominante) {
        similarity += 3;
        factors += 3;
      }
      
      if (currentData.padraoConstrutivo && property.padraoConstrutivo === currentData.padraoConstrutivo) {
        similarity += 2;
        factors += 2;
      }
      
      if (currentData.numeroPavimentos && property.numeroPavimentos === currentData.numeroPavimentos) {
        similarity += 1;
        factors += 1;
      }
      
      return factors > 0 && (similarity / factors) > 0.5;
    });

    if (similarProperties.length === 0) return suggestions;

    // Sugestões para área construída baseada em propriedades similares
    if (!currentData.areaConstruida && similarProperties.some(p => p.areaConstruida)) {
      const areas = similarProperties.filter(p => p.areaConstruida).map(p => p.areaConstruida!);
      const averageArea = areas.reduce((sum, area) => sum + area, 0) / areas.length;
      
      suggestions.push({
        field: 'areaConstruida',
        value: Math.round(averageArea),
        confidence: 0.8,
        reason: `Média de propriedades similares: ${Math.round(averageArea)}m²`
      });
    }

    // Sugestões para área do terreno
    if (!currentData.areaTerreno && similarProperties.some(p => p.areaTerreno)) {
      const areas = similarProperties.filter(p => p.areaTerreno).map(p => p.areaTerreno!);
      const averageArea = areas.reduce((sum, area) => sum + area, 0) / areas.length;
      
      suggestions.push({
        field: 'areaTerreno',
        value: Math.round(averageArea),
        confidence: 0.7,
        reason: `Média de terrenos similares: ${Math.round(averageArea)}m²`
      });
    }

    return suggestions;
  }

  // Analisa estatísticas de um campo específico
  private analyzeField(properties: PropertyHistory[], field: string) {
    const values = properties.map(p => (p as any)[field]).filter(v => v !== undefined && v !== null);
    
    if (values.length === 0) return { mostCommon: null, confidence: 0, percentage: 0 };
    
    const frequency: { [key: string]: number } = {};
    values.forEach(value => {
      const key = String(value);
      frequency[key] = (frequency[key] || 0) + 1;
    });
    
    const mostCommonKey = Object.keys(frequency).reduce((a, b) => 
      frequency[a] > frequency[b] ? a : b
    );
    
    const count = frequency[mostCommonKey];
    const percentage = Math.round((count / values.length) * 100);
    const confidence = count / values.length;
    
    // Converter de volta para o tipo original
    let mostCommon: any = mostCommonKey;
    if (field === 'numeroPavimentos' || field === 'areaTerreno' || field === 'areaConstruida') {
      mostCommon = Number(mostCommonKey);
    } else if (['agua', 'esgoto', 'energia', 'iluminacaoPublica', 'coletaLixo', 'meioFio'].includes(field)) {
      mostCommon = mostCommonKey === 'true';
    }
    
    return { mostCommon, confidence, percentage };
  }

  // Calcula distância entre duas coordenadas em km
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

  private getServiceName(service: string): string {
    const names: { [key: string]: string } = {
      agua: 'água encanada',
      esgoto: 'rede de esgoto',
      energia: 'energia elétrica',
      iluminacaoPublica: 'iluminação pública',
      coletaLixo: 'coleta de lixo',
      meioFio: 'meio-fio'
    };
    return names[service] || service;
  }

  // Abre conexão com IndexedDB
  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('PropertyAutofillDB', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('propertyHistory')) {
          const store = db.createObjectStore('propertyHistory', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          store.createIndex('location', ['latitude', 'longitude']);
          store.createIndex('timestamp', 'timestamp');
        }
      };
    });
  }
}

export const smartAutofillService = new SmartAutofillService();