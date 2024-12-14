const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

class AdvancedCryptoScanner {
    constructor(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            throw new Error('API Key es requerida y debe ser una cadena de texto');
        }
        this.apiKey = apiKey;
        this.baseUrl = 'https://pro-api.coinmarketcap.com/v1';
        this.minMarketCap = 1000000; // $1M
        this.minVolume = 100000;     // $100K
        this.minVolumeRatio = 0.05;  // 5%
    }

    async initialize() {
        try {
            const logDir = path.join(__dirname, 'logs');
            await fs.mkdir(logDir, { recursive: true });
            this.logFile = path.join(logDir, `crypto_scanner_${new Date().toISOString().split('T')[0]}.log`);
            await this.log('Scanner inicializado correctamente');
        } catch (error) {
            throw new Error(`Error en la inicialización: ${error.message}`);
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

    formatNumber(number, decimals = 2) {
        try {
            return number.toFixed(decimals);
        } catch {
            return '0';
        }
    }

    normalizeValue(value, min, max) {
        return Math.max(min, Math.min(value, max));
    }

    async scanOpportunities() {
        try {
            const response = await axios.get(`${this.baseUrl}/cryptocurrency/listings/latest`, {
                headers: {
                    'X-CMC_PRO_API_KEY': this.apiKey
                },
                params: {
                    start: '1',
                    limit: '500',
                    convert: 'USD'
                }
            });

            if (!response.data?.data) {
                throw new Error('Respuesta de API inválida');
            }

            const opportunities = response.data.data
                .filter(coin => {
                    try {
                        return (
                            coin.quote.USD.market_cap >= this.minMarketCap &&
                            coin.quote.USD.volume_24h >= this.minVolume &&
                            (coin.quote.USD.volume_24h / coin.quote.USD.market_cap) >= this.minVolumeRatio
                        );
                    } catch {
                        return false;
                    }
                })
                .map(coin => {
                    try {
                        return {
                            symbol: coin.symbol,
                            name: coin.name,
                            price: coin.quote.USD.price,
                            marketCap: coin.quote.USD.market_cap,
                            volume24h: coin.quote.USD.volume_24h,
                            change24h: coin.quote.USD.percent_change_24h,
                            change7d: coin.quote.USD.percent_change_7d,
                            volumeRatio: coin.quote.USD.volume_24h / coin.quote.USD.market_cap,
                            score: this.calculateScore(coin),
                            risk: this.calculateRisk(coin),
                            potentialReturn: this.calculatePotentialReturn(coin)
                        };
                    } catch (error) {
                        this.log(`Error procesando moneda ${coin.symbol}: ${error.message}`);
                        return null;
                    }
                })
                .filter(coin => coin !== null)
                .sort((a, b) => b.score - a.score);

            return opportunities;

        } catch (error) {
            await this.log(`Error en scanOpportunities: ${error.message}`);
            throw error;
        }
    }

    calculateScore(coin) {
        const momentum = (coin.quote.USD.percent_change_24h + 100) / 100;
        const trend = (coin.quote.USD.percent_change_7d + 100) / 100;
        const volume = Math.min(coin.quote.USD.volume_24h / coin.quote.USD.market_cap * 10, 5);
        
        return (momentum * 0.3 + trend * 0.4 + volume * 0.3) * 100;
    }

    calculateRisk(coin) {
        const marketCapRisk = coin.quote.USD.market_cap < 10000000 ? 3 : 
                            coin.quote.USD.market_cap < 100000000 ? 2 : 1;
        
        const volumeRisk = (coin.quote.USD.volume_24h / coin.quote.USD.market_cap) < 0.1 ? 3 :
                          (coin.quote.USD.volume_24h / coin.quote.USD.market_cap) < 0.2 ? 2 : 1;
        
        const volatilityRisk = Math.abs(coin.quote.USD.percent_change_24h) > 20 ? 3 :
                              Math.abs(coin.quote.USD.percent_change_24h) > 10 ? 2 : 1;

        const avgRisk = (marketCapRisk + volumeRisk + volatilityRisk) / 3;
        return avgRisk > 2.5 ? "Alto" : avgRisk > 1.5 ? "Medio" : "Bajo";
    }

    calculatePotentialReturn(coin) {
        const marketCapFactor = Math.max(0, Math.log10(1000000000 / Math.max(coin.quote.USD.market_cap, 1)));
        const momentumFactor = Math.max(0.1, (coin.quote.USD.percent_change_7d + 100) / 100);
        const volumeFactor = this.normalizeValue(coin.quote.USD.volume_24h / coin.quote.USD.market_cap * 10, 0.1, 5);

        return this.normalizeValue(marketCapFactor * momentumFactor * volumeFactor, 1, 10);
    }

    async analyzeSpecificCoin(symbol) {
        try {
            const response = await axios.get(`${this.baseUrl}/cryptocurrency/quotes/latest`, {
                headers: {
                    'X-CMC_PRO_API_KEY': this.apiKey
                },
                params: {
                    symbol: symbol.toUpperCase(),
                    convert: 'USD'
                }
            });

            const coinData = response.data.data[symbol.toUpperCase()];
            if (!coinData) {
                throw new Error('Moneda no encontrada');
            }

            const analysis = {
                basic: {
                    name: coinData.name,
                    symbol: coinData.symbol,
                    price: coinData.quote.USD.price,
                    marketCap: coinData.quote.USD.market_cap,
                    volume24h: coinData.quote.USD.volume_24h
                },
                performance: {
                    change1h: coinData.quote.USD.percent_change_1h,
                    change24h: coinData.quote.USD.percent_change_24h,
                    change7d: coinData.quote.USD.percent_change_7d,
                    change30d: coinData.quote.USD.percent_change_30d,
                },
                analysis: {
                    risk: this.calculateRisk(coinData),
                    potentialReturn: this.calculatePotentialReturn(coinData),
                    score: this.calculateScore(coinData)
                }
            };

            await this.displayAnalysis(analysis);
            return analysis;

        } catch (error) {
            await this.log(`Error analizando ${symbol}: ${error.message}`);
            throw error;
        }
    }

    async displayAnalysis(analysis) {
        const details = [
            `\n=== Análisis de ${analysis.basic.name} (${analysis.basic.symbol}) ===`,
            `\nPrecios y Volumen:`,
            `Precio: $${this.formatNumber(analysis.basic.price, 8)}`,
            `Market Cap: $${this.formatNumber(analysis.basic.marketCap / 1000000)}M`,
            `Volumen 24h: $${this.formatNumber(analysis.basic.volume24h / 1000000)}M`,
            
            `\nRendimiento:`,
            `1h: ${this.formatNumber(analysis.performance.change1h)}%`,
            `24h: ${this.formatNumber(analysis.performance.change24h)}%`,
            `7d: ${this.formatNumber(analysis.performance.change7d)}%`,
            `30d: ${this.formatNumber(analysis.performance.change30d)}%`,
            
            `\nAnálisis:`,
            `Nivel de Riesgo: ${analysis.analysis.risk}`,
            `Score: ${this.formatNumber(analysis.analysis.score)}`,
            `Retorno Potencial Estimado: ${this.formatNumber(analysis.analysis.potentialReturn)}x`,
            '\n===================='
        ];
        
        console.log(details.join('\n'));
    }

    async displayOpportunityDetails(coin) {
        const details = [
            `\n=== ${coin.name} (${coin.symbol}) ===`,
            `Precio: $${this.formatNumber(coin.price, 8)}`,
            `Market Cap: $${this.formatNumber(coin.marketCap / 1000000)}M`,
            `Volumen 24h: $${this.formatNumber(coin.volume24h / 1000000)}M`,
            `Cambio 24h: ${this.formatNumber(coin.change24h)}%`,
            `Cambio 7d: ${this.formatNumber(coin.change7d)}%`,
            `Score: ${this.formatNumber(coin.score)}`,
            `Riesgo: ${coin.risk}`,
            `Retorno Potencial: ${this.formatNumber(coin.potentialReturn)}x`,
            '===================='
        ];
        
        console.log(details.join('\n'));
    }
}

async function startScanner() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (query) => new Promise((resolve) => rl.question(query, resolve));

    try {
        console.log('=== Scanner Avanzado de Criptomonedas ===');
        const apiKey = await question('Introduce tu API key de CoinMarketCap: ');

        if (!apiKey.trim()) {
            throw new Error('API Key no puede estar vacía');
        }

        const scanner = new AdvancedCryptoScanner(apiKey);
        await scanner.initialize();

        while (true) {
            console.log('\nOpciones:');
            console.log('1. Ver Top 10 Oportunidades');
            console.log('2. Analizar una Criptomoneda Específica');
            console.log('3. Salir');

            const option = await question('\nSelecciona una opción: ');

            switch (option) {
                case '1':
                    console.log('\nBuscando las mejores oportunidades...');
                    const opportunities = await scanner.scanOpportunities();
                    if (opportunities.length > 0) {
                        console.log('\nTop 10 Oportunidades con Mayor Potencial:');
                        for (const coin of opportunities.slice(0, 10)) {
                            await scanner.displayOpportunityDetails(coin);
                        }
                    } else {
                        console.log('\nNo se encontraron oportunidades que cumplan los criterios.');
                    }
                    break;

                case '2':
                    const symbol = await question('Introduce el símbolo de la criptomoneda (ej: BTC): ');
                    try {
                        await scanner.analyzeSpecificCoin(symbol);
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

// Iniciar el scanner
startScanner();
