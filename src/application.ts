import { buildResultsFromCSVData, getAbbreviationForParty } from './data-builder';
import { formatRawResults, getRawResults } from './lib';
import { REFRESH_INTERVAL, TOTAL_NB_REGISTERED_ELECTORS, TOTAL_NB_SEATS } from './settings';
import { generateColorGradient } from './utilities';


/**
 * Application.
 */
export default class Application {
    /**
     * Chart for the number of Votes per Party.
     */
    protected VotesChart: Chart = null;
    /**
     * Chart for the number of Seats per Party.
     */
    protected SeatsChart: Chart = null;
    /**
     * ID of the Riding currently being displayed.
     */
    protected SelectedRidingID: number = -1;
    /**
     * List of Riding data.
     */
    protected Ridings: Circonscription[] = [];
    /**
     * Maximum number of parties to display on Charts.
     */
    protected readonly MAX_PARTIES_COUNT_FOR_CHARTS = 8;


    /**
     * Constructor.
     */
    constructor() {
        this.installListeners();
        this.fetchData();
    }

    /**
     * Create Charts for number of Votes and Seats per Party.
     */
    protected setupCharts() {
        const initialData: number[] = [];

        const createChartConfig = (gradientFrom: string, gradientTo: string) => {
            const colorPalette = generateColorGradient(gradientFrom, gradientTo, this.MAX_PARTIES_COUNT_FOR_CHARTS);

            return {
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: initialData,
                        borderWidth: Array(this.MAX_PARTIES_COUNT_FOR_CHARTS + 3).fill(0), // Enough values for a lot of parties.
                        backgroundColor: colorPalette,
                        hoverBackgroundColor: colorPalette
                    }]
                },
                options: {
                    cutoutPercentage: 90,
                    legend: {
                        position: 'left'
                    },
                    animation: {
                        animateRotate: true
                    },
                    elements: {
                        center: {
                            text: '',
                            color: '#8a8d93',
                            fontStyle: 'Muli, sans-serif'
                        }
                    }
                }
            };
        };

        // Create "Seats" Chart:
        // Gradient palette: ['#da4d60', '#e96577', '#f28695', '#ffb6c1', '#e5e5e5']
        const seatsCanvas = document.getElementById('seats') as HTMLCanvasElement;
        if (seatsCanvas !== null) {
            this.SeatsChart = new Chart(
                seatsCanvas,
                createChartConfig('#da4d60', '#e5e5e5')
            );
        }

        // Create "Votes" Chart:
        // Gradient palette: ['#6933b9', '#8553d1', '#a372ec', '#be9df1', '#e5e5e5']
        const votesCanvas = document.getElementById('votes') as HTMLCanvasElement;
        if (votesCanvas !== null) {
            this.VotesChart = new Chart(
                votesCanvas,
                createChartConfig('#6933b9', '#e5e5e5')
            );
        }
    }

    /**
     * Install DOM Listeners.
     */
    protected installListeners() {
        const ridingsDropDownElement = document.getElementById('ridings-list') as HTMLSelectElement;
        if (ridingsDropDownElement !== null) {
            ridingsDropDownElement.addEventListener('change', e => {
                this.SelectedRidingID = parseInt(ridingsDropDownElement.options[ridingsDropDownElement.selectedIndex].value, 10);
                const selectedRiding = this.Ridings.filter(riding => riding.numeroCirconscription === this.SelectedRidingID);
                this.updateRiding(selectedRiding[0]);
            });
        }
    }

    /**
     * Fetch results from the remote web service.
     */
    protected async fetchData() {
        try {
            const rawResults = await getRawResults();
            const lines = await formatRawResults(rawResults);
            const data = buildResultsFromCSVData(lines);

            this.onResultsLoaded(data);
        } catch (ex) {
            // tslint:disable-next-line:no-console
            console.error(ex);
        } finally {
            setTimeout(() => {
                this.fetchData();
            }, REFRESH_INTERVAL);
        }
    }

    /**
     * Callback executed upon loading results from the remote web service.
     *
     * @param results Results loaded from the remote web service.
     */
    protected onResultsLoaded(results: Results) {
        const sortedParties = [...results.statistiques.partisPolitiques]
            .sort((a, b) => {
                // Number of ridings in advance first:
                if (a.nbCirconscriptionsEnAvance > b.nbCirconscriptionsEnAvance) {
                    return -1;
                } else if (a.nbCirconscriptionsEnAvance < b.nbCirconscriptionsEnAvance) {
                    return 1;
                } else {
                    // Number of total votes second:
                    if (a.nbVoteTotal > b.nbVoteTotal) {
                        return -1;
                    } else if (a.nbVoteTotal < b.nbVoteTotal) {
                        return 1;
                    } else {
                        // Alphabetical last:
                        if (a.nomPartiPolitique > b.nomPartiPolitique) {
                            return 1;
                        } else if (a.nomPartiPolitique < b.nomPartiPolitique) {
                            return -1;
                        } else {
                            return 0;
                        }
                    }
                }
            });

        const partiesList = document.getElementById('parties-list');
        if (partiesList !== null) {
            partiesList.innerHTML = sortedParties
                .map((party, i) => {
                    return `
                        <tr>
                            <th scope="row" class="text-right">${party.nbCirconscriptionsEnAvance > 0 ? i + 1 : ''}</th>
                            <td>${party.nomPartiPolitique}</td>
                            <td>${getAbbreviationForParty(party.abreviationPartiPolitique)}</td>
                            <td class="text-right">${party.tauxVoteTotal.toFixed(2)}<small>&nbsp;%</small></td>
                            <td class="text-right">${party.nbCirconscriptionsEnAvance}</td>
                        </tr>`;
                })
                .join('');
        }

        // Store data about the Ridings:
        this.Ridings = results.circonscriptions;

        // Update dashboard data:
        this.updateOverviewStats(results);
        this.updateStationsRidingsResults(results);
        this.updateRidings(results);
        if (this.SeatsChart === null && this.VotesChart === null) {
            this.setupCharts();
        }
        this.drawVotesChart(results);
        this.drawSeatsChart(results);
    }

    /**
     * Update results for the top 4 political parties.
     *
     * @param results Results loaded from the remote web service.
     */
    protected updateOverviewStats(results: Results) {
        const resultCards = document.querySelectorAll('.result-card');
        const nbResults = Math.min(
            resultCards.length,
            results.statistiques.partisPolitiques.length
        );

        for (let i = 0; i < nbResults; ++i) {
            const party = results.statistiques.partisPolitiques[i];
            if (party.tauxCirconscriptionsEnAvance > 0) {
                const resultCard = resultCards[i];

                const partyName: HTMLDivElement = resultCard.querySelector('.party-name');
                if (partyName !== null) {
                    partyName.innerText = party.abreviationPartiPolitique;
                }

                const seatCounter: HTMLDivElement = resultCard.querySelector('.count');
                if (seatCounter !== null) {
                    seatCounter.innerText = party.nbCirconscriptionsEnAvance.toString();
                }

                const seatsLabel: HTMLDivElement = resultCard.querySelector('.seats-label');
                if (seatsLabel !== null) {
                    seatsLabel.innerText = `seat${party.nbCirconscriptionsEnAvance > 1 ? 's' : ''}`;
                }

                const voteProgressBar: HTMLDivElement = resultCard.querySelector(`.dashbg-${i + 1}`);
                if (voteProgressBar !== null) {
                    voteProgressBar.style.width = `${party.tauxCirconscriptionsEnAvance}%`;
                }
            }
        }
    }

    /**
     * Update polling station results.
     *
     * @param results Results loaded from the remote web service.
     */
    protected updateStationsRidingsResults(results: Results) {
        const { statistiques } = results;

        const stationsResults = document.querySelector('.stations-results');
        if (stationsResults !== null) {
            const count: HTMLElement = stationsResults.querySelector('.count');
            if (count !== null && statistiques.nbBureauVoteRempli >= 0) {
                count.innerText = statistiques.nbBureauVoteRempli.toLocaleString();
            }

            const progressBar: HTMLDivElement = stationsResults.querySelector('div[role="progressbar"]');
            if (progressBar !== null) {
                progressBar.style.width = `${statistiques.tauxBureauVoteRempli}%`;
            }
        }

        const ridingsResults = document.querySelector('.ridings-results');
        if (ridingsResults !== null) {
            const count: HTMLElement = ridingsResults.querySelector('.count');
            if (count !== null) {
                count.innerText = statistiques.nbCirconscriptionAvecResultat.toLocaleString();
            }

            const progressBar: HTMLDivElement = ridingsResults.querySelector('div[role="progressbar"]');
            if (progressBar !== null) {
                progressBar.style.width = `${100.0 - statistiques.tauxCirconscriptionSansResultat}%`;
            }
        }

        if (statistiques.nbVoteExerce > 0) {
            const votesCast = document.getElementById('votes-cast');
            if (votesCast !== null) {
                votesCast.innerText = statistiques.nbVoteExerce.toLocaleString();
            }
            const partPercent = document.getElementById('part-rate');
            if (partPercent !== null) {
                partPercent.style.width = `${statistiques.tauxParticipationTotal}%`;
            }

            const validVotes = document.getElementById('valid-votes');
            if (validVotes !== null) {
                validVotes.innerText = statistiques.nbVoteValide.toLocaleString();
            }
            const validVotesRate = document.getElementById('valid-votes-rate');
            if (validVotesRate !== null) {
                validVotesRate.style.width = `${statistiques.nbVoteValide * 100 / statistiques.nbVoteExerce}%`;
            }

            const rejectedVotes = document.getElementById('rejected-votes');
            if (rejectedVotes !== null) {
                rejectedVotes.innerText = statistiques.nbVoteRejete.toLocaleString();
            }
            const rejectedVoteRate = document.getElementById('rejected-vote-rate');
            if (rejectedVoteRate !== null) {
                rejectedVoteRate.style.width = `${statistiques.nbVoteRejete * 100 / statistiques.nbVoteExerce}%`;
            }

            const participationRate = document.getElementById('participation-rate');
            const participationRateValue = parseFloat(statistiques.tauxParticipationTotal);
            if (participationRate !== null && participationRateValue >= 0) {
                const participationRateLabel = isNaN(participationRateValue)
                    ? '&mdash;'
                    : `${participationRateValue}%`;
                participationRate.innerHTML = participationRateLabel;
            }
        }


        // Update the timestamp of the last refresh time:
        const lastUpdatedDate = document.getElementById('last-update-date');
        const lastUpdateTime = document.getElementById('last-update-time');
        if (lastUpdatedDate !== null && lastUpdateTime !== null) {
            const lastUpdateDate = new Date(
                Date.parse(statistiques.iso8601DateMAJ.replace(',', '.'))
            );
            lastUpdatedDate.innerText = lastUpdateDate.toLocaleDateString();
            lastUpdateTime.innerText = lastUpdateDate.toLocaleTimeString();
        }
    }

    /**
     * Update the Chart for the number of Seats per Party.
     *
     * @param results Results loaded from the remote web service.
     */
    protected drawSeatsChart(results: Results) {
        const { statistiques } = results;

        const sortedPartiesWithSeats = [...statistiques.partisPolitiques]
            .filter(party => party.nbVoteTotal > 0)
            .sort((a, b) => {
                if (a.nbCirconscriptionsEnAvance > b.nbCirconscriptionsEnAvance) {
                    return -1;
                } else if (a.nbCirconscriptionsEnAvance > b.nbCirconscriptionsEnAvance) {
                    return 1;
                } else {
                    return 0;
                }
            });
        let seats: number[] = [];
        let labels: string[] = [];
        if (sortedPartiesWithSeats.length > this.MAX_PARTIES_COUNT_FOR_CHARTS) {
            const dataWithLabels = sortedPartiesWithSeats
                .filter((_, index) => index < this.MAX_PARTIES_COUNT_FOR_CHARTS);
            seats = [
                ...dataWithLabels.map(party => party.nbCirconscriptionsEnAvance),
                sortedPartiesWithSeats
                    .filter((_, index) => index >= this.MAX_PARTIES_COUNT_FOR_CHARTS)
                    .reduce((accumulator, party) => accumulator + party.nbCirconscriptionsEnAvance, 0)
            ];
            labels = [
                ...dataWithLabels.map(party => party.abreviationPartiPolitique),
                'Others'
            ];
        } else {
            seats = sortedPartiesWithSeats.map(party => party.nbCirconscriptionsEnAvance);
            labels = sortedPartiesWithSeats.map(party => party.abreviationPartiPolitique);
        }
        seats.push(0);
        seats.push(
            TOTAL_NB_SEATS - seats
                .reduce((accumulator, partyVotes) => accumulator + partyVotes, 0)
        );

        if (this.SeatsChart !== null) {
            // const colors = this.SeatsChart.data.datasets[0].backgroundColor;
            // let colorPalette = generateColorGradient(
            //     colors[0], // Gradient start color
            //     colors[colors.length - 1], // Gradient end color
            //     labels.length // Number of gradient steps to generate
            // );
            // if (labels.length < 2) {
            //     colorPalette = [ colorPalette[0] ];
            // }

            this.SeatsChart.data.labels = labels;
            this.SeatsChart.data.datasets[0].data = seats;
            // this.SeatsChart.data.datasets[0].backgroundColor = colorPalette;
            // this.SeatsChart.data.datasets[0].hoverBackgroundColor = colorPalette;
            this.SeatsChart.options.elements.center.text = labels[0];
            this.SeatsChart.update();
        }

        const leadingPartyLabel = document.getElementById('leading-party-by-seats');
        if (leadingPartyLabel !== null && labels.length > 0) {
            leadingPartyLabel.innerText = labels[0];
        }
    }

    /**
     * Update the Chart for the number of Votes per Party.
     *
     * @param results Results loaded from the remote web service.
     */
    protected drawVotesChart(results: Results) {
        const { statistiques } = results;

        const sortedPartiesWithVotes = [...statistiques.partisPolitiques]
            .filter(party => party.nbVoteTotal > 0)
            .sort((a, b) => {
                if (a.nbVoteTotal > b.nbVoteTotal) {
                    return -1;
                } else if (a.nbVoteTotal > b.nbVoteTotal) {
                    return 1;
                } else {
                    return 0;
                }
            });
        let votes: number[] = [];
        let labels: string[] = [];
        if (sortedPartiesWithVotes.length > this.MAX_PARTIES_COUNT_FOR_CHARTS) {
            const dataWithLabels = sortedPartiesWithVotes
                .filter((_, index) => index < this.MAX_PARTIES_COUNT_FOR_CHARTS);
            votes = [
                ...dataWithLabels.map(party => party.nbVoteTotal),
                sortedPartiesWithVotes
                    .filter((_, index) => index >= this.MAX_PARTIES_COUNT_FOR_CHARTS)
                    .reduce((accumulator, party) => accumulator + party.nbVoteTotal, 0)
            ];
            labels = [
                ...dataWithLabels.map(party => party.abreviationPartiPolitique),
                'Others'
            ];
        } else {
            votes = sortedPartiesWithVotes.map(party => party.nbVoteTotal);
            labels = sortedPartiesWithVotes.map(party => party.abreviationPartiPolitique);
        }
        votes.push(0);
        votes.push(
            TOTAL_NB_REGISTERED_ELECTORS - votes
                .reduce((accumulator, partyVotes) => accumulator + partyVotes, 0)
        );

        if (this.VotesChart !== null) {
            // const colors = this.VotesChart.data.datasets[0].backgroundColor;
            // let colorPalette = generateColorGradient(
            //     this.VotesStartColor, //colors[0], // Gradient start color
            //     colors[colors.length - 1], // Gradient end color
            //     //labels.length // Number of gradient steps to generate
            //     this.MAX_PARTIES_COUNT_FOR_CHARTS + 2
            // );
            // if (labels.length < 2) {
            //     // colorPalette = [ colorPalette[0] ];
            // }

            this.VotesChart.data.labels = labels;
            this.VotesChart.data.datasets[0].data = votes;
            // this.VotesChart.data.datasets[0].backgroundColor = colorPalette;
            // this.VotesChart.data.datasets[0].hoverBackgroundColor = colorPalette;
            this.VotesChart.options.elements.center.text = labels[0];
            this.VotesChart.update();
        }

        const leadingPartyLabel = document.getElementById('leading-party-by-votes');
        if (leadingPartyLabel !== null && labels.length > 0) {
            leadingPartyLabel.innerText = labels[0];
        }
    }

    /**
     * Update the data about the Riding currently displayed.
     *
     * @param results Results loaded from the remote web service.
     */
    protected updateRidings(results: Results) {
        // Update the list of available ridings:
        const ridingsDropDownElement = document.getElementById('ridings-list');
        if (ridingsDropDownElement !== null) {
            ridingsDropDownElement.innerHTML = results.circonscriptions
                .map(riding => {
                    const isSelected = this.SelectedRidingID === riding.numeroCirconscription
                        ? 'selected="selected"'
                        : '';
                    return `
                        <option ${isSelected} value="${riding.numeroCirconscription}">
                            ${riding.nomCirconscription}
                        </option>`;
                })
                .join('');
        }

        // Update the riding currently displayed:
        if (this.SelectedRidingID !== -1) {
            const selectedRiding = results.circonscriptions
                .filter(riding => riding.numeroCirconscription === this.SelectedRidingID);
            this.updateRiding(selectedRiding[0]);
        } else if (results.circonscriptions.length > 0) {
            this.updateRiding(results.circonscriptions[0]);
        }
    }

    /**
     * Update the Riding currently displayed.
     *
     * @param riding Data about the Riding currently displayed.
     */
    protected updateRiding(riding: Circonscription) {
        const ridingCandidatesList = document.getElementById('riding-candidates-list');
        if (ridingCandidatesList !== null) {
            ridingCandidatesList.innerHTML = riding.candidats
                .map((candidate, i) => {
                    const advanceVotes = candidate.nbVoteAvance > 0
                        ? `<span class="text-success">
                                <i class="fa fa-caret-up"></i> ${candidate.nbVoteAvance.toLocaleString()}
                            </span>`
                        : '';
                    return `
                        <tr>
                            <th scope="row" class="text-right">${candidate.nbVoteTotal > 0 ? i + 1 : ''}</th>
                            <td>${candidate.nomPartiPolitique}</td>
                            <td>${candidate.prenom} ${candidate.nom}</td>
                            <td class="text-right">${candidate.nbVoteTotal.toLocaleString()}</td>
                            <td class="text-left">${advanceVotes}</td>
                            <td class="text-right">${candidate.tauxVote.toFixed(2)}&nbsp;<small>%</small></td>
                        </tr>`;
                })
                .join('');
        }

        const ridingStationsComplete = document.getElementById('riding-stations-complete');
        if (ridingStationsComplete !== null) {
            ridingStationsComplete.innerText = riding.nbBureauComplete.toLocaleString();
        }

        const ridingStationsTotal = document.getElementById('riding-stations-total');
        if (ridingStationsTotal !== null) {
            ridingStationsTotal.innerText = riding.nbBureauTotal.toLocaleString();
        }

        const ridingRegisteredVoters = document.getElementById('riding-registered-voters');
        if (ridingRegisteredVoters !== null) {
            ridingRegisteredVoters.innerText = riding.nbElecteurInscrit.toLocaleString();
        }

        const ridingParticipationRate = document.getElementById('riding-participation-rate');
        if (ridingParticipationRate !== null) {
            const participationRateValue = parseFloat(riding.tauxParticipation);
            const participationRateLabel = isNaN(participationRateValue)
                ? '&mdash;'
                : `${participationRateValue.toFixed(2)}%`;
            ridingParticipationRate.innerHTML = participationRateLabel;
        }
    }
}
