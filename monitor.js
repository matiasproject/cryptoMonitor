const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

class CryptoMonitor {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://pro-api.coinmarketcap.com/v1';
        this.watchlist = new Map();
        this.coinbaseAssets = new Set();
    }

    async initialize() {
        try {
            const logDir = path.join(__dirname, 'logs');
            await fs.mkdir(logDir, { recursive: true });
            this.logFile = path.join(logDir, `crypto_${new Date().toISOString().split('T')[0]}.log`);
            await this.updateCoinbaseAssets();
        } catch (error) {
            console.error('Error inicializando sistema:', error);
            process.exit(1);
        }
    }

    async updateCoinbaseAssets() {
        try {
            // Usar la API de productos de Coinbase para obtener las criptos listadas
            const response = await axios.get('https://api.coinbase.com/v2/exchange-rates');
            const rates = response.data.data.rates;
            // Guardar los símbolos normalizados
            this.coinbaseAssets = new Set(
                Object.keys(rates).map(symbol => symbol.toUpperCase())
            );
            await this.log(`Actualizada lista de ${this.coinbaseAssets.size} activos de Coinbase`);
        } catch (error) {
            await this.log(`Error actualizando lista de Coinbase: ${error.message}`);
            throw error;
        }
    }

    isOnCoinbase(symbol) {
        return this.coinbaseAssets.has(symbol.toUpperCase());
    }

    async log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `${timestamp} - ${message}\n`;
        await fs.appendFile(this.logFile, logMessage);
        console.log(message);
    }

    async searchPotentialCoins(minMarketCap = 1000000, maxMarketCap = 50000000, onlyCoinbase = false) {
        try {
            const response = await axios.get(`${this.baseUrl}/cryptocurrency/listings/latest`, {
                headers: {
                    'X-CMC_PRO_API_KEY': this.apiKey
                },
                params: {
                    start: '1',
                    limit: '200',
                    convert: 'USD',
                    sort: 'market_cap',
                    sort_dir: 'asc'
                }
            });

            const potentialCoins = response.data.data
                .filter(coin => {
                    const marketCap = coin.quote.USD.market_cap;
                    const volume24h = coin.quote.USD.volume_24h;
                    const volumeRatio = volume24h / marketCap;
                    const isCoinbaseListed = this.isOnCoinbase(coin.symbol);

                    // Si onlyCoinbase es true, solo incluir monedas en Coinbase
                    if (onlyCoinbase && !isCoinbaseListed) {
                        return false;
                    }

                    return (
                        marketCap >= minMarketCap &&
                        marketCap <= maxMarketCap &&
                        volumeRatio > 0.1
                    );
                })
                .map(coin => ({
                    symbol: coin.symbol,
                    name: coin.name,
                    price: coin.quote.USD.price,
                    marketCap: coin.quote.USD.market_cap,
                    volume24h: coin.quote.USD.volume_24h,
                    change24h: coin.quote.USD.percent_change_24h,
                    change7d: coin.quote.USD.percent_change_7d,
                    volumeRatio: coin.quote.USD.volume_24h / coin.quote.USD.market_cap,
                    isOnCoinbase: this.isOnCoinbase(coin.symbol),
                    score: this.calculateScore(coin)
                }));

            // Si no hay resultados, log informativo
            if (potentialCoins.length === 0) {
                await this.log(onlyCoinbase ? 
                    'No se encontraron monedas que cumplan los criterios en Coinbase' :
                    'No se encontraron monedas que cumplan los criterios');
            }

            return potentialCoins.sort((a, b) => b.score - a.score);
        } catch (error) {
            await this.log(`Error buscando monedas: ${error.message}`);
            return [];
        }
    }

    calculateScore(coin) {
        const volumeScore = (coin.quote.USD.volume_24h / coin.quote.USD.market_cap) * 0.4;
        const change7dScore = Math.min(Math.max(coin.quote.USD.percent_change_7d, -100), 100) * 0.3;
        const change24hScore = Math.min(Math.max(coin.quote.USD.percent_change_24h, -50), 50) * 0.3;
        return volumeScore + change7dScore + change24hScore;
    }

    async displayCoinDetails(coin) {
        const details = [
            `\n=== ${coin.name} (${coin.symbol}) ===`,
            `Precio: $${coin.price.toFixed(8)}`,
            `Market Cap: $${(coin.marketCap / 1000000).toFixed(2)}M`,
            `Volumen 24h: $${(coin.volume24h / 1000000).toFixed(2)}M`,
            `Cambio 24h: ${coin.change24h.toFixed(2)}%`,
            `Cambio 7d: ${coin.change7d.toFixed(2)}%`,
            `Ratio Volumen/MC: ${coin.volumeRatio.toFixed(2)}`,
            `Disponible en Coinbase: ${coin.isOnCoinbase ? 'Sí ✓' : 'No ✗'}`,
            `Score: ${coin.score.toFixed(2)}`,
            '=================='
        ];
        
        console.log(details.join('\n'));
    }

    async addToWatchlist(symbol, targetMultiplier) {
        try {
            const response = await axios.get(`${this.baseUrl}/cryptocurrency/quotes/latest`, {
                headers: {
                    'X-CMC_PRO_API_KEY': this.apiKey
                },
                params: {
                    symbol: symbol,
                    convert: 'USD'
                }
            });

            const initialPrice = response.data.data[symbol].quote.USD.price;
            this.watchlist.set(symbol, {
                initialPrice,
                targetMultiplier,
                targetPrice: initialPrice * targetMultiplier
            });

            await this.log(`Añadida ${symbol} a la watchlist. Precio inicial: $${initialPrice}`);
        } catch (error) {
            await this.log(`Error añadiendo ${symbol} a la watchlist: ${error.message}`);
        }
    }

    async monitorPrices() {
        while (true) {
            for (const [symbol, data] of this.watchlist) {
                try {
                    const response = await axios.get(`${this.baseUrl}/cryptocurrency/quotes/latest`, {
                        headers: {
                            'X-CMC_PRO_API_KEY': this.apiKey
                        },
                        params: {
                            symbol: symbol,
                            convert: 'USD'
                        }
                    });

                    const currentPrice = response.data.data[symbol].quote.USD.price;
                    const multiplier = currentPrice / data.initialPrice;

                    await this.log(`${symbol} - Precio: $${currentPrice} (${multiplier.toFixed(2)}x)`);

                    if (currentPrice >= data.targetPrice) {
                        await this.log(`¡ALERTA! ${symbol} ha alcanzado el objetivo de ${data.targetMultiplier}x`);
                    }
                } catch (error) {
                    await this.log(`Error monitoreando ${symbol}: ${error.message}`);
                }
            }

            // Esperar 5 minutos antes de la siguiente comprobación
            await new Promise(resolve => setTimeout(resolve, 300000));
        }
    }
}

// Interfaz de línea de comandos
async function startCLI() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (query) => new Promise((resolve) => rl.question(query, resolve));

    try {
        console.log('=== Monitor de Criptomonedas ===');
        const apiKey = await question('Introduce tu API key de CoinMarketCap: ');

        const monitor = new CryptoMonitor(apiKey);
        await monitor.initialize();

        while (true) {
            console.log('\nOPCIONES:');
            console.log('1. Buscar todas las oportunidades');
            console.log('2. Buscar solo en Coinbase');
            console.log('3. Añadir moneda a watchlist');
            console.log('4. Iniciar monitoreo');
            console.log('5. Salir');

            const option = await question('\nSelecciona una opción: ');

            switch (option) {
                case '1':
                case '2':
                    const onlyCoinbase = option === '2';
                    console.log('\nBuscando oportunidades...');
                    const coins = await monitor.searchPotentialCoins(1000000, 50000000, onlyCoinbase);
                    
                    if (coins.length > 0) {
                        console.log('\nMejores oportunidades encontradas:');
                        for (const coin of coins.slice(0, 5)) {
                            await monitor.displayCoinDetails(coin);
                        }
                    } else {
                        console.log('\nNo se encontraron oportunidades que cumplan los criterios.');
                    }
                    break;

                case '3':
                    const symbol = await question('Introduce el símbolo de la moneda: ');
                    const multiplier = parseFloat(await question('Introduce el multiplicador objetivo (ej: 2 para 2x): '));
                    await monitor.addToWatchlist(symbol, multiplier);
                    break;

                case '4':
                    if (monitor.watchlist.size === 0) {
                        console.log('Añade primero algunas monedas a la watchlist');
                        break;
                    }
                    console.log('Iniciando monitoreo...');
                    await monitor.monitorPrices();
                    break;

                case '5':
                    console.log('¡Hasta luego!');
                    rl.close();
                    process.exit(0);
                    break;

                default:
                    console.log('Opción no válida');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        rl.close();
        process.exit(1);
    }
}

// Iniciar la aplicación
startCLI();