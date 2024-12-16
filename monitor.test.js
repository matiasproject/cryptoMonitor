const AdvancedCryptoAnalyzer = require('../monitor');
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');

describe('AdvancedCryptoAnalyzer', () => {
    let analyzer;
    let mockAxios;
    const mockApiKey = 'test-api-key';

    beforeEach(() => {
        mockAxios = new MockAdapter(axios);
        analyzer = new AdvancedCryptoAnalyzer(mockApiKey);
    });

    afterEach(() => {
        mockAxios.reset();
    });

    describe('Inicialización', () => {
        test('debería crear una instancia correctamente', () => {
            expect(analyzer).toBeInstanceOf(AdvancedCryptoAnalyzer);
            expect(analyzer.apiKey).toBe(mockApiKey);
        });

        test('debería fallar sin API key', () => {
            expect(() => new AdvancedCryptoAnalyzer()).toThrow('API Key es requerida');
        });

        test('debería inicializar con constantes correctas', () => {
            expect(analyzer.constants).toBeDefined();
            expect(analyzer.constants.MARKET_SEGMENTS).toBeDefined();
            expect(analyzer.constants.VOLUME_RATIOS).toBeDefined();
            expect(analyzer.btcDominanceAnalyzer).toBeDefined();
        });

        test('debería crear directorio de logs', async () => {
            mockAxios.onGet().reply(200, { data: { rates: {} } });
            await analyzer.initialize();
            expect(analyzer.logFile).toBeDefined();
        });
    });

    describe('Análisis de Bitcoin Dominance', () => {
        const mockBTCDominance = {
            data: {
                btc_dominance: 45.5,
                quotes: [
                    { timestamp: '2023-01-01', btc_dominance: 40 },
                    { timestamp: '2023-01-02', btc_dominance: 42 },
                    { timestamp: '2023-01-03', btc_dominance: 45 }
                ]
            }
        };

        beforeEach(() => {
            mockAxios.onGet(/.*global-metrics.*/).reply(200, mockBTCDominance);
        });

        test('debería obtener dominancia actual', async () => {
            const dominance = await analyzer.btcDominanceAnalyzer.getCurrentDominance();
            expect(dominance).toBe(45.5);
        });

        test('debería analizar ciclo de mercado', async () => {
            const analysis = await analyzer.btcDominanceAnalyzer.analyzeMarketCycle();
            expect(analysis).toHaveProperty('currentDominance');
            expect(analysis).toHaveProperty('phase');
            expect(analysis).toHaveProperty('impact');
            expect(analysis).toHaveProperty('recommendations');
        });

        test('debería identificar fases correctamente', () => {
            const scenarios = [
                { dominance: 65, expectedPhase: 'btc_dominance' },
                { dominance: 35, expectedPhase: 'altcoin_season' },
                { dominance: 45, expectedPhase: 'transition' }
            ];

            scenarios.forEach(scenario => {
                const phase = analyzer.btcDominanceAnalyzer.determineCyclePhase(scenario.dominance);
                expect(phase.name).toBe(scenario.expectedPhase);
            });
        });

        test('debería calcular impactos correctamente', () => {
            const impact = analyzer.btcDominanceAnalyzer.assessMarketImpact(45.5);
            expect(impact).toHaveProperty('btcImpact');
            expect(impact).toHaveProperty('altcoinImpact');
            expect(impact.btcImpact + impact.altcoinImpact).toBe(2);
        });
    });

    describe('Análisis de Token', () => {
        const mockTokenData = {
            data: {
                BTC: {
                    name: 'Bitcoin',
                    symbol: 'BTC',
                    quote: {
                        USD: {
                            price: 50000,
                            market_cap: 1e12,
                            volume_24h: 5e10,
                            percent_change_1h: 1,
                            percent_change_24h: 5,
                            percent_change_7d: 10,
                            percent_change_30d: 20
                        }
                    }
                }
            }
        };

        const mockBTCDominance = {
            currentDominance: 45,
            phase: { name: 'transition', description: 'Fase de transición' },
            impact: { btcImpact: 1, altcoinImpact: 1 }
        };

        beforeEach(() => {
            mockAxios.onGet(/.*quotes.*/).reply(200, mockTokenData);
            mockAxios.onGet(/.*global-metrics.*/).reply(200, { data: { btc_dominance: 45 } });
        });

        test('debería analizar token correctamente', async () => {
            const analysis = await analyzer.analyzeToken('BTC');
            expect(analysis).toHaveProperty('basic');
            expect(analysis).toHaveProperty('metrics');
            expect(analysis).toHaveProperty('performance');
            expect(analysis).toHaveProperty('btcDominance');
            expect(analysis).toHaveProperty('adjustedScore');
        });

        test('debería calcular métricas correctamente', () => {
            const analysis = analyzer.calculateMarketMaturity(1e12);
            expect(analysis).toHaveProperty('score');
            expect(analysis).toHaveProperty('category');
        });

        test('debería calcular salud del volumen', () => {
            const health = analyzer.calculateVolumeHealth(0.3);
            expect(health).toHaveProperty('score');
            expect(health).toHaveProperty('category');
            expect(health.score).toBeGreaterThan(0);
            expect(health.score).toBeLessThanOrEqual(1);
        });

        test('debería calcular momentum correctamente', () => {
            const momentum = analyzer.calculateMomentumIndicator([1, 2, -1, 3]);
            expect(momentum).toBeGreaterThanOrEqual(0);
            expect(momentum).toBeLessThanOrEqual(1);
        });

        test('debería calcular volatilidad correctamente', () => {
            const volatility = analyzer.calculateVolatilityScore([1, 2, -1, 3]);
            expect(volatility).toHaveProperty('score');
            expect(volatility).toHaveProperty('category');
        });
    });

    describe('Cálculo de Scores y Riesgo', () => {
        const mockAnalysis = {
            basic: {
                marketCap: 1e12,
                volume24h: 5e10
            },
            metrics: {
                marketMaturity: { score: 1.5 },
                volumeHealth: { score: 0.8 },
                momentum: 0.7,
                volatility: { score: 0.4 }
            }
        };

        test('debería calcular investment score', () => {
            const score = analyzer.calculateInvestmentScore(mockAnalysis);
            expect(score).toBeGreaterThanOrEqual(1);
            expect(score).toBeLessThanOrEqual(10);
        });

        test('debería calcular nivel de riesgo', () => {
            const risk = analyzer.calculateRiskLevel(mockAnalysis);
            expect(risk).toHaveProperty('level');
            expect(risk).toHaveProperty('score');
            expect(['Alto', 'Medio', 'Bajo']).toContain(risk.level);
        });

        test('debería calcular retorno potencial', () => {
            const potential = analyzer.calculatePotentialReturn(mockAnalysis);
            expect(potential).toBeGreaterThanOrEqual(1);
            expect(potential).toBeLessThanOrEqual(10);
        });

        test('debería ajustar scores por dominancia BTC', () => {
            const baseAnalysis = { ...mockAnalysis, investmentScore: 7.5 };
            const btcDominance = {
                impact: { btcImpact: 1.2, altcoinImpact: 0.8 }
            };

            const adjusted = analyzer.adjustForBTCDominance(baseAnalysis, btcDominance);
            expect(adjusted.adjustedScore).not.toBe(baseAnalysis.investmentScore);
        });
    });

    describe('Funcionalidades de Visualización', () => {
        test('debería formatear números correctamente', () => {
            expect(analyzer.formatNumber(1234567890)).toBe('1.23B');
            expect(analyzer.formatNumber(1234567)).toBe('1.23M');
            expect(analyzer.formatNumber(1234)).toBe('1.23K');
            expect(analyzer.formatNumber(123.456, 3)).toBe('123.456');
        });

        test('debería interpretar scores correctamente', () => {
            const interpretations = [
                { score: 9, expectContains: 'Excepcional' },
                { score: 7, expectContains: 'Muy Buena' },
                { score: 5, expectContains: 'Sólida' },
                { score: 3, expectContains: 'Especulativa' },
                { score: 1, expectContains: 'Alto Riesgo' }
            ];

            interpretations.forEach(({ score, expectContains }) => {
                const interpretation = analyzer.interpretInvestmentScore(score);
                expect(interpretation).toContain(expectContains);
            });
        });
    });

    describe('Escaneo de Oportunidades', () => {
        const mockListings = {
            data: {
                data: Array(10).fill().map((_, i) => ({
                    name: `Coin${i}`,
                    symbol: `COIN${i}`,
                    quote: {
                        USD: {
                            price: 100,
                            market_cap: 1e9,
                            volume_24h: 1e8,
                            percent_change_24h: 5,
                            percent_change_7d: 10
                        }
                    }
                }))
            }
        };

        beforeEach(() => {
            mockAxios.onGet(/.*listings.*/).reply(200, mockListings);
            mockAxios.onGet(/.*quotes.*/).reply(200, { data: mockListings.data });
            mockAxios.onGet(/.*global-metrics.*/).reply(200, { data: { btc_dominance: 45 } });
        });

        test('debería escanear oportunidades correctamente', async () => {
            const opportunities = await analyzer.scanTopOpportunities();
            expect(opportunities).toBeInstanceOf(Array);
            expect(opportunities.length).toBeLessThanOrEqual(10);
            if (opportunities.length > 1) {
                expect(opportunities[0].adjustedScore).toBeGreaterThanOrEqual(opportunities[1].adjustedScore);
            }
        });
    });

    describe('Manejo de Errores', () => {
        test('debería manejar errores de API', async () => {
            mockAxios.onGet().networkError();
            await expect(analyzer.analyzeToken('BTC')).rejects.toThrow();
        });

        test('debería manejar errores en cálculos', () => {
            const invalidAnalysis = {
                metrics: {},
                basic: {}
            };
            expect(() => analyzer.calculateInvestmentScore(invalidAnalysis)).not.toThrow();
        });

        test('debería manejar tokens no encontrados', async () => {
            mockAxios.onGet(/.*quotes.*/).reply(200, { data: {} });
            await expect(analyzer.analyzeToken('INVALID')).rejects.toThrow('Token no encontrado');
        });
    });
});