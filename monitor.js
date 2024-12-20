const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

class BitcoinDominanceAnalyzer {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://pro-api.coinmarketcap.com/v1';
        
        this.cyclePhases = {
            BTC_DOMINANCE: 'btc_dominance',
            ALTCOIN_SEASON: 'altcoin_season',
            TRANSITION: 'transition',
            ACCUMULATION: 'accumulation'
        };

        this.thresholds = {
            DOMINANCE: {
                HIGH: 60,
                MEDIUM: 45,
                LOW: 35
            }
        };
    }

    async getCurrentDominance() {
        try {
            const response = await axios.get(`${this.baseUrl}/global-metrics/quotes/latest`, {
                headers: { 'X-CMC_PRO_API_KEY': this.apiKey }
            });
            return response.data.data.btc_dominance;
        } catch (error) {
            throw new Error(`Error obteniendo dominancia BTC: ${error.message}`);
        }
    }

    async analyzeMarketCycle() {
        try {
            const currentDominance = await this.getCurrentDominance();
            const phase = this.determineCyclePhase(currentDominance);
            const impact = this.assessMarketImpact(currentDominance);
            
            return {
                currentDominance,
                phase,
                impact,
                recommendations: this.generateRecommendations(currentDominance)
            };
        } catch (error) {
            throw new Error(`Error en análisis de ciclo: ${error.message}`);
        }
    }

    determineCyclePhase(dominance) {
        const { HIGH, MEDIUM, LOW } = this.thresholds.DOMINANCE;
        
        if (dominance >= HIGH) {
            return {
                name: this.cyclePhases.BTC_DOMINANCE,
                strength: 'high',
                description: 'Dominio fuerte de Bitcoin'
            };
        } else if (dominance <= LOW) {
            return {
                name: this.cyclePhases.ALTCOIN_SEASON,
                strength: 'high',
                description: 'Temporada favorable para altcoins'
            };
        } else if (dominance < MEDIUM) {
            return {
                name: this.cyclePhases.TRANSITION,
                strength: 'medium',
                description: 'Fase de transición'
            };
        }
        return {
            name: this.cyclePhases.ACCUMULATION,
            strength: 'medium',
            description: 'Fase de acumulación'
        };
    }

    assessMarketImpact(dominance) {
        return {
            btcImpact: this.calculateBTCImpact(dominance),
            altcoinImpact: this.calculateAltcoinImpact(dominance)
        };
    }

    calculateBTCImpact(dominance) {
        const { HIGH, LOW } = this.thresholds.DOMINANCE;
        if (dominance >= HIGH) return 1.2;
        if (dominance <= LOW) return 0.8;
        return 1.0;
    }

    calculateAltcoinImpact(dominance) {
        return 2 - this.calculateBTCImpact(dominance);
    }

    generateRecommendations(dominance) {
        const phase = this.determineCyclePhase(dominance);
        const recommendations = [];

        switch (phase.name) {
            case this.cyclePhases.BTC_DOMINANCE:
                recommendations.push({
                    type: 'BTC_FOCUS',
                    action: 'Priorizar Bitcoin',
                    confidence: 'Alta'
                });
                break;
            case this.cyclePhases.ALTCOIN_SEASON:
                recommendations.push({
                    type: 'ALT_FOCUS',
                    action: 'Considerar altcoins de alta capitalización',
                    confidence: 'Alta'
                });
                break;
            case this.cyclePhases.TRANSITION:
                recommendations.push({
                    type: 'MIXED',
                    action: 'Diversificar entre BTC y altcoins selectas',
                    confidence: 'Media'
                });
                break;
            default:
                recommendations.push({
                    type: 'CONSERVATIVE',
                    action: 'Mantener posiciones conservadoras',
                    confidence: 'Media'
                });
        }

        return recommendations;
    }
}

class AdvancedCryptoAnalyzer {
    constructor(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            throw new Error('API Key es requerida');
        }
        this.apiKey = apiKey;
        this.baseUrl = 'https://pro-api.coinmarketcap.com/v1';
        this.coinbaseTokens = new Set();
        this.btcDominanceAnalyzer = new BitcoinDominanceAnalyzer(apiKey);
        
        this.constants = {
            MARKET_SEGMENTS: {
                MICRO_CAP: 50000000,
                SMALL_CAP: 250000000,
                MID_CAP: 1000000000,
                LARGE_CAP: 10000000000
            },
            VOLATILITY_THRESHOLDS: {
                LOW: 5,
                MEDIUM: 15,
                HIGH: 25
            },
            VOLUME_RATIOS: {
                HEALTHY: 0.15,
                STRONG: 0.30,
                EXCEPTIONAL: 0.50
            },
            BTC_DOMINANCE: {
                HIGH: 60,
                MEDIUM: 45,
                LOW: 35
            }
        };
    }

    async initialize() {
        try {
            const logDir = path.join(__dirname, 'logs');
            await fs.mkdir(logDir, { recursive: true });
            this.logFile = path.join(logDir, `crypto_analyzer_${new Date().toISOString().split('T')[0]}.log`);
            await this.updateCoinbaseTokens();
            await this.log('Analizador inicializado correctamente');
        } catch (error) {
            throw new Error(`Error en la inicialización: ${error.message}`);
        }
    }

    async updateCoinbaseTokens() {
        try {
            const response = await axios.get('https://api.coinbase.com/v2/exchange-rates');
            this.coinbaseTokens = new Set(Object.keys(response.data.data.rates));
            await this.log(`Lista de tokens de Coinbase actualizada: ${this.coinbaseTokens.size} tokens`);
        } catch (error) {
            await this.log(`Error actualizando lista de Coinbase: ${error.message}`);
        }
    }

    async log(message) {
        try {
            const timestamp = new Date().toISOString();
            const logMessage = `${timestamp} - ${message}\n`;
            await fs.appendFile(this.logFile, logMessage);
            console.log(message);
        } catch (error) {
            console.error('Error escribiendo log:', error);
        }
    }

    calculateMarketMaturity(marketCap) {
        const { MARKET_SEGMENTS } = this.constants;
        if (marketCap >= MARKET_SEGMENTS.LARGE_CAP) return { score: 1.0, category: 'Establecido' };
        if (marketCap >= MARKET_SEGMENTS.MID_CAP) return { score: 1.5, category: 'Maduro' };
        if (marketCap >= MARKET_SEGMENTS.SMALL_CAP) return { score: 2.0, category: 'En Desarrollo' };
        if (marketCap >= MARKET_SEGMENTS.MICRO_CAP) return { score: 2.5, category: 'Emergente' };
        return { score: 3.0, category: 'Especulativo' };
    }

    calculateVolumeHealth(volumeRatio) {
        const { VOLUME_RATIOS } = this.constants;
        const normalizedRatio = Math.min(volumeRatio, VOLUME_RATIOS.EXCEPTIONAL);
        const volumeScore = Math.log10(normalizedRatio * 100 + 1) / Math.log10(VOLUME_RATIOS.EXCEPTIONAL * 100 + 1);
        
        return {
            score: volumeScore,
            category: volumeRatio >= VOLUME_RATIOS.EXCEPTIONAL ? 'Excepcional' :
                     volumeRatio >= VOLUME_RATIOS.STRONG ? 'Fuerte' :
                     volumeRatio >= VOLUME_RATIOS.HEALTHY ? 'Saludable' : 'Bajo'
        };
    }

    calculateMomentumIndicator(priceChanges) {
        const gains = priceChanges.filter(x => x > 0);
        const losses = priceChanges.filter(x => x < 0).map(x => Math.abs(x));
        
        const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b) / gains.length : 0;
        const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b) / losses.length : 0;

        if (avgLoss === 0) return 1;
        const RS = avgGain / avgLoss;
        return (100 - (100 / (1 + RS))) / 100;
    }

    calculateVolatilityScore(priceChanges) {
        const { VOLATILITY_THRESHOLDS } = this.constants;
        
        const mean = priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length;
        const variance = priceChanges.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / priceChanges.length;
        const stdDev = Math.sqrt(variance);

        return {
            score: Math.min(stdDev / VOLATILITY_THRESHOLDS.HIGH, 1),
            category: stdDev > VOLATILITY_THRESHOLDS.HIGH ? 'Alta' :
                     stdDev > VOLATILITY_THRESHOLDS.MEDIUM ? 'Media' : 'Baja'
        };
    }

    calculateInvestmentScore(analysis) {
        const marketMaturityScore = (4 - analysis.metrics.marketMaturity.score) * 2;
        const volumeScore = analysis.metrics.volumeHealth.score * 10;
        const momentumScore = analysis.metrics.momentum * 10;
        const volatilityAdjustment = Math.max(0, 1 - analysis.metrics.volatility.score);
        const marketCapOptimality = Math.min(10, Math.log10(1e11 / analysis.basic.marketCap) * 2);
        const volumeRatio = Math.min(10, (analysis.basic.volume24h / analysis.basic.marketCap) * 5);

        return Math.max(1, Math.min(10, (
            marketMaturityScore * 0.2 +
            volumeScore * 0.2 +
            momentumScore * 0.25 +
            volatilityAdjustment * 0.15 +
            marketCapOptimality * 0.1 +
            volumeRatio * 0.1
        )));
    }

    async analyzeToken(symbol) {
        try {
            const [tokenData, btcDominance] = await Promise.all([
                axios.get(`${this.baseUrl}/cryptocurrency/quotes/latest`, {
                    headers: { 'X-CMC_PRO_API_KEY': this.apiKey },
                    params: { symbol: symbol.toUpperCase(), convert: 'USD' }
                }),
                this.btcDominanceAnalyzer.analyzeMarketCycle()
            ]);

            const coinData = tokenData.data.data[symbol.toUpperCase()];
            if (!coinData) throw new Error('Token no encontrado');

            const baseAnalysis = this.performBaseAnalysis(coinData);
            return this.adjustForBTCDominance(baseAnalysis, btcDominance);
        } catch (error) {
            throw new Error(`Error analizando ${symbol}: ${error.message}`);
        }
    }

    performBaseAnalysis(coinData) {
        const priceChanges = [
            coinData.quote.USD.percent_change_1h,
            coinData.quote.USD.percent_change_24h,
            coinData.quote.USD.percent_change_7d,
            coinData.quote.USD.percent_change_30d
        ].filter(x => x !== null);

        const analysis = {
            basic: {
                name: coinData.name,
                symbol: coinData.symbol,
                price: coinData.quote.USD.price,
                marketCap: coinData.quote.USD.market_cap,
                volume24h: coinData.quote.USD.volume_24h
            },
            metrics: {
                marketMaturity: this.calculateMarketMaturity(coinData.quote.USD.market_cap),
                volumeHealth: this.calculateVolumeHealth(
                    coinData.quote.USD.volume_24h / coinData.quote.USD.market_cap
                ),
                momentum: this.calculateMomentumIndicator(priceChanges),
                volatility: this.calculateVolatilityScore(priceChanges)
            },
            performance: {
                change1h: coinData.quote.USD.percent_change_1h,
                change24h: coinData.quote.USD.percent_change_24h,
                change7d: coinData.quote.USD.percent_change_7d,
                change30d: coinData.quote.USD.percent_change_30d
            },
            isOnCoinbase: this.coinbaseTokens.has(coinData.symbol)
        };

        analysis.investmentScore = this.calculateInvestmentScore(analysis);
        analysis.riskLevel = this.calculateRiskLevel(analysis);
        analysis.potentialReturn = this.calculatePotentialReturn(analysis);

        return analysis;
    }

    adjustForBTCDominance(analysis, btcDominance) {
        const isBTC = analysis.basic.symbol.toUpperCase() === 'BTC';
        const dominanceImpact = isBTC ? 
            btcDominance.impact.btcImpact : 
            btcDominance.impact.altcoinImpact;

        return {
            ...analysis,
            btcDominance,
            adjustedScore: analysis.investmentScore * dominanceImpact
        };
    }

    calculateRiskLevel(analysis) {
        const volatilityWeight = analysis.metrics.volatility.score * 0.4;
        const marketMaturityWeight = (analysis.metrics.marketMaturity.score / 3) * 0.3;
        const volumeWeight = (1 - analysis.metrics.volumeHealth.score) * 0.3;

        const riskScore = volatilityWeight + marketMaturityWeight + volumeWeight;

        return {
            level: riskScore > 0.66 ? 'Alto' : riskScore > 0.33 ? 'Medio' : 'Bajo',
            score: riskScore
        };
    }

    calculatePotentialReturn(analysis) {
      const marketGrowthFactor = Math.log10(1e11 / analysis.basic.marketCap) * 0.5;
      const volumeHealthFactor = analysis.metrics.volumeHealth.score;
      const momentumFactor = analysis.metrics.momentum;
      const maturityFactor = (4 - analysis.metrics.marketMaturity.score) / 3;

      const potential = (
          marketGrowthFactor * 0.4 +
          volumeHealthFactor * 0.2 +
          momentumFactor * 0.2 +
          maturityFactor * 0.2
      ) * 10;

      return Math.max(1, Math.min(10, potential));
  }

  async scanTopOpportunities() {
      try {
          const response = await axios.get(`${this.baseUrl}/cryptocurrency/listings/latest`, {
              headers: {
                  'X-CMC_PRO_API_KEY': this.apiKey
              },
              params: {
                  start: '1',
                  limit: '100',
                  convert: 'USD',
                  sort: 'volume_24h',
                  sort_dir: 'desc'
              }
          });

          const opportunities = [];

          for (const coin of response.data.data) {
              try {
                  const analysis = await this.analyzeToken(coin.symbol);
                  opportunities.push(analysis);
              } catch (error) {
                  await this.log(`Error analizando ${coin.symbol}: ${error.message}`);
              }
          }

          return opportunities
              .sort((a, b) => b.adjustedScore - a.adjustedScore)
              .slice(0, 10);
      } catch (error) {
          throw new Error(`Error escaneando oportunidades: ${error.message}`);
      }
  }

  formatNumber(number, decimals = 2) {
      try {
          if (number >= 1e9) return `${(number / 1e9).toFixed(decimals)}B`;
          if (number >= 1e6) return `${(number / 1e6).toFixed(decimals)}M`;
          if (number >= 1e3) return `${(number / 1e3).toFixed(decimals)}K`;
          return number.toFixed(decimals);
      } catch {
          return '0';
      }
  }

  interpretInvestmentScore(score) {
      if (score >= 8) return "Oportunidad Excepcional - Métricas sobresalientes en todos los aspectos";
      if (score >= 7) return "Oportunidad Muy Buena - Fuerte potencial con riesgos moderados";
      if (score >= 5) return "Oportunidad Sólida - Buen balance entre potencial y riesgo";
      if (score >= 3) return "Oportunidad Especulativa - Alto riesgo con potencial incierto";
      return "Oportunidad de Alto Riesgo - Se recomienda extrema precaución";
  }

  async displayAnalysis(analysis) {
      const details = [
          `\n=== Análisis Profesional de ${analysis.basic.name} (${analysis.basic.symbol}) ===`,
          
          '\nDatos de Mercado:',
          `Precio: $${this.formatNumber(analysis.basic.price, 8)}`,
          `Capitalización: $${this.formatNumber(analysis.basic.marketCap)}`,
          `Volumen 24h: $${this.formatNumber(analysis.basic.volume24h)}`,
          
          '\nMétricas de Rendimiento:',
          `1h: ${this.formatNumber(analysis.performance.change1h)}%`,
          `24h: ${this.formatNumber(analysis.performance.change24h)}%`,
          `7d: ${this.formatNumber(analysis.performance.change7d)}%`,
          `30d: ${this.formatNumber(analysis.performance.change30d)}%`,
          
          '\nAnálisis Técnico:',
          `Madurez de Mercado: ${analysis.metrics.marketMaturity.category}`,
          `Salud del Volumen: ${analysis.metrics.volumeHealth.category}`,
          `Momentum: ${analysis.metrics.momentum.toFixed(2)}`,
          `Volatilidad: ${analysis.metrics.volatility.category}`
      ];

      if (analysis.btcDominance) {
          details.push(
              '\nContexto de Mercado:',
              `Dominancia BTC: ${analysis.btcDominance.currentDominance.toFixed(2)}%`,
              `Fase de Mercado: ${analysis.btcDominance.phase.description}`,
              `Impacto en ${analysis.basic.symbol}: ${(analysis.adjustedScore / analysis.investmentScore).toFixed(2)}x`
          );
      }

      details.push(
          '\nIndicadores de Inversión:',
          `Score Base: ${analysis.investmentScore.toFixed(2)}/10`,
          `Score Ajustado: ${analysis.adjustedScore.toFixed(2)}/10`,
          `Nivel de Riesgo: ${analysis.riskLevel.level}`,
          `Retorno Potencial: ${analysis.potentialReturn.toFixed(2)}x`,
          `Disponible en Coinbase: ${analysis.isOnCoinbase ? '✅ Sí' : '❌ No'}`,
          
          '\nInterpretación:',
          this.interpretInvestmentScore(analysis.adjustedScore),
          
          '\nNotas:',
          '- El Score de Inversión combina todas las métricas analizadas',
          '- Scores > 7 indican oportunidades excepcionales',
          '- Considerar siempre el nivel de riesgo y el marco temporal',
          '- La presencia en Coinbase indica mayor liquidez y accesibilidad',
          '====================\n'
      );
      
      console.log(details.join('\n'));
  }

  async displayTopOpportunities(opportunities) {
      console.log('\n=== Top 10 Mejores Oportunidades de Inversión ===\n');
      
      for (const opportunity of opportunities) {
          console.log(`${opportunity.basic.name} (${opportunity.basic.symbol}):`);
          console.log(`Precio: $${this.formatNumber(opportunity.basic.price, 8)}`);
          console.log(`Score de Inversión: ${opportunity.adjustedScore.toFixed(2)}/10`);
          console.log(`Retorno Potencial: ${opportunity.potentialReturn.toFixed(2)}x`);
          console.log(`Riesgo: ${opportunity.riskLevel.level}`);
          console.log(`Disponible en Coinbase: ${opportunity.isOnCoinbase ? '✅ Sí' : '❌ No'}`);
          console.log('--------------------\n');
      }
  }
}

async function startAnalyzer() {
  const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  try {
      console.log('=== Analizador Profesional de Criptomonedas ===');
      const apiKey = await question('Introduce tu API key de CoinMarketCap: ');

      if (!apiKey.trim()) {
          throw new Error('API Key no puede estar vacía');
      }

      const analyzer = new AdvancedCryptoAnalyzer(apiKey);
      await analyzer.initialize();

      while (true) {
          console.log('\nOpciones:');
          console.log('1. Analizar Token Específico');
          console.log('2. Ver Top 10 Mejores Oportunidades');
          console.log('3. Salir');

          const option = await question('\nSelecciona una opción: ');

          switch (option) {
              case '1':
                  const symbol = await question('Introduce el símbolo del token (ej: BTC): ');
                  try {
                      const analysis = await analyzer.analyzeToken(symbol);
                      await analyzer.displayAnalysis(analysis);
                  } catch (error) {
                      console.log(`\nError: ${error.message}`);
                  }
                  break;

              case '2':
                  console.log('\nBuscando mejores oportunidades...');
                  try {
                      const opportunities = await analyzer.scanTopOpportunities();
                      await analyzer.displayTopOpportunities(opportunities);
                  } catch (error) {
                      console.log(`\nError: ${error.message}`);
                  }
                  break;

              case '3':
                  console.log('¡Hasta luego!');
                  rl.close();
                  return;

              default:
                  console.log('Opción no válida');
          }
      }

  } catch (error) {
      console.error('Error en la ejecución:', error.message);
  } finally {
      rl.close();
  }
}

startAnalyzer();
