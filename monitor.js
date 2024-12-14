const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

class AdvancedCryptoScanner {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://pro-api.coinmarketcap.com/v1';
    }

    async initialize() {
        const logDir = path.join(__dirname, 'logs');
        await fs.mkdir(logDir, { recursive: true });
        this.logFile = path.join(logDir, `crypto_${new Date().toISOString().split('T')[0]}.log`);
    }

    calculateAdvancedScore(coin) {
        // Métricas de momentum
        const momentum24h = coin.quote.USD.percent_change_24h;
        const momentum7d = coin.quote.USD.percent_change_7d;
        
        // Métricas de volumen
        const volumeMarketCapRatio = coin.quote.USD.volume_24h / coin.quote.USD.market_cap;
        
        // Métricas de tamaño y crecimiento
        const marketCapScore = Math.min(coin.quote.USD.market_cap / 1000000000, 1); // Normalizado a 1B
        const priceScore = Math.log10(Math.max(coin.quote.USD.price, 0.00000001)) + 10; // Normaliza precios muy bajos y muy altos
        
        // Ponderaciones
        const weights = {
            momentum24h: 0.2,
            momentum7d: 0.3,
            volume: 0.3,
            marketCap: 0.1,
            price: 0.1
        };

        // Cálculo del score final
        return (
            (momentum24h * weights.momentum24h) +
            (momentum7d * weights.momentum7d) +
            (volumeMarketCapRatio * 100 * weights.volume) +
            (marketCapScore * weights.marketCap) +
            (priceScore * weights.price)
        );
    }

    async scanOpportunities() {
        try {
            const response = await axios.get(`${this.baseUrl}/cryptocurrency/listings/latest`, {
                headers: {
                    'X-CMC_PRO_API_KEY': this.apiKey
                },
                params: {
                    start: '1',
                    limit: '500', // Analizamos más monedas
                    convert: 'USD'
                }
            });

            const opportunities = response.data.data
                .map(coin => {
                    const score = this.calculateAdvancedScore(coin);
                    return {
                        symbol: coin.symbol,
                        name: coin.name,
                        price: coin.quote.USD.price,
                        marketCap: coin.quote.USD.market_cap,
                        volume24h: coin.quote.USD.volume_24h,
                        change24h: coin.quote.USD.percent_change_24h,
                        change7d: coin.quote.USD.percent_change_7d,
                        volumeRatio: coin.quote.USD.volume_24h / coin.quote.USD.market_cap,
                        score: score,
                        riskLevel: this.calculateRiskLevel(coin),
                        potentialReturn: this.estimatePotentialReturn(coin)
                    };
                })
                .filter(coin => 
                    coin.marketCap > 1000000 && // Mínimo $1M market cap
                    coin.volume24h > 100000 && // Mínimo $100k volumen diario
                    coin.volumeRatio > 0.05 // Mínimo 5% ratio volumen/market cap
                )
                .sort((a, b) => b.score - a.score);

            return opportunities;
        } catch (error) {
            console.error('Error escaneando oportunidades:', error.message);
            return [];
        }
    }

    calculateRiskLevel(coin) {
        const marketCapRisk = coin.quote.USD.market_cap < 10000000 ? 'Alto' : 
                            coin.quote.USD.market_cap < 100000000 ? 'Medio' : 'Bajo';
        const volumeRisk = (coin.quote.USD.volume_24h / coin.quote.USD.market_cap) < 0.1 ? 'Alto' : 'Medio';
        const volatilityRisk = Math.abs(coin.quote.USD.percent_change_24h) > 20 ? 'Alto' : 'Medio';

        const riskFactors = [marketCapRisk, volumeRisk, volatilityRisk];
        const highRiskCount = riskFactors.filter(risk => risk === 'Alto').length;

        return highRiskCount >= 2 ? 'Alto' : highRiskCount >= 1 ? 'Medio' : 'Bajo';
    }

    estimatePotentialReturn(coin) {
        const marketCapFactor = Math.log10(1000000000 / coin.quote.USD.market_cap);
        const momentumFactor = (coin.quote.USD.percent_change_7d + 100) / 100;
        const volumeFactor = Math.min(coin.quote.USD.volume_24h / coin.quote.USD.market_cap * 10, 5);

        return Math.min(marketCapFactor * momentumFactor * volumeFactor, 10);
    }

    async displayOpportunityDetails(coin) {
        const details = [
            `\n=== ${coin.name} (${coin.symbol}) ===`,
            `Precio: $${coin.price.toFixed(8)}`,
            `Market Cap: $${(coin.marketCap / 1000000).toFixed(2)}M`,
            `Volumen 24h: $${(coin.volume24h / 1000000).toFixed(2)}M`,
            `Cambio 24h: ${coin.change24h.toFixed(2)}%`,
            `Cambio 7d: ${coin.change7d.toFixed(2)}%`,
            `Ratio Volumen/MC: ${coin.volumeRatio.toFixed(2)}`,
            `Score: ${coin.score.toFixed(2)}`,
            `Nivel de Riesgo: ${coin.riskLevel}`,
            `Retorno Potencial Estimado: ${coin.potentialReturn.toFixed(1)}x`,
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

    try {
        console.log('=== Scanner Avanzado de Criptomonedas ===');
        const apiKey = await new Promise(resolve => rl.question('Introduce tu API key de CoinMarketCap: ', resolve));

        const scanner = new AdvancedCryptoScanner(apiKey);
        await scanner.initialize();

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

        rl.close();
    } catch (error) {
        console.error('Error:', error);
        rl.close();
    }
}

startScanner();
