(function () {
    'use strict';

    const TOTAL_NB_SEATS = 338;
    const TOTAL_NB_REGISTERED_ELECTORS = 27126166;
    const REFRESH_INTERVAL = 30 * 1000;

    function buildResultsFromCSVData(lineResults) {
        const preliminaryCirconscriptions = new Map();
        const validatedCirconscriptions = new Map();
        const iso8601DateMAJ = (new Date()).toISOString();
        for (const lineResult of lineResults) {
            const emptyCirconscriptionData = {
                candidats: [],
                isResultatsFinaux: false,
                iso8601DateMAJ,
                nbBureauComplete: -1,
                nbBureauTotal: -1,
                nbElecteurInscrit: -1,
                nbVoteExerce: lineResult.totalNumberOfBallotsCast,
                nbVoteRejete: lineResult.rejectedBallots,
                nbVoteValide: lineResult.totalNumberOfBallotsCast - lineResult.rejectedBallots,
                nomCirconscription: lineResult.electoralDistrictName,
                numeroCirconscription: lineResult.electoralDistrictNumber,
                tauxParticipation: '-1.0',
                tauxVoteRejete: -1.0,
                tauxVoteValide: -1.0
            };
            const circonscriptionNumber = lineResult.electoralDistrictNumber;
            if (lineResult.typeOfResults === 'preliminary' && !preliminaryCirconscriptions.has(circonscriptionNumber)) {
                preliminaryCirconscriptions.set(circonscriptionNumber, emptyCirconscriptionData);
            }
            else if (lineResult.typeOfResults === 'validated' && !validatedCirconscriptions.has(circonscriptionNumber)) {
                emptyCirconscriptionData.isResultatsFinaux = true;
                validatedCirconscriptions.set(circonscriptionNumber, emptyCirconscriptionData);
            }
        }
        for (const lineResult of lineResults) {
            const candidate = {
                abreviationPartiPolitique: getAbbreviationForParty(lineResult.politicalAffiliation),
                nbVoteAvance: 0,
                nbVoteTotal: lineResult.votesObtained,
                nom: lineResult.surname,
                nomPartiPolitique: lineResult.politicalAffiliation,
                numeroCandidat: -1,
                numeroPartiPolitique: -1,
                prenom: lineResult.givenName,
                tauxVote: lineResult.percentVotesObtained
            };
            const circonscriptionNumber = lineResult.electoralDistrictNumber;
            if (lineResult.typeOfResults === 'preliminary') {
                preliminaryCirconscriptions.get(circonscriptionNumber).candidats.push(candidate);
            }
            else if (lineResult.typeOfResults === 'validated') {
                validatedCirconscriptions.get(circonscriptionNumber).candidats.push(candidate);
            }
        }
        const partyResults = new Map();
        for (const [_, circonscriptionData] of preliminaryCirconscriptions.entries()) {
            const circonscriptionNumber = circonscriptionData.numeroCirconscription;
            if (validatedCirconscriptions.has(circonscriptionNumber)) {
                partyResults.set(circonscriptionNumber, validatedCirconscriptions.get(circonscriptionNumber));
            }
            else {
                partyResults.set(circonscriptionNumber, preliminaryCirconscriptions.get(circonscriptionNumber));
            }
        }
        for (const [_, circonscriptionData] of validatedCirconscriptions.entries()) {
            const circonscriptionNumber = circonscriptionData.numeroCirconscription;
            if (!partyResults.has(circonscriptionNumber)) {
                partyResults.set(circonscriptionNumber, validatedCirconscriptions.get(circonscriptionNumber));
            }
        }
        for (const [_, circonscriptionData] of partyResults.entries()) {
            circonscriptionData.candidats.sort((a, b) => {
                if (a.nbVoteTotal > b.nbVoteTotal) {
                    return -1;
                }
                else if (a.nbVoteTotal < b.nbVoteTotal) {
                    return 1;
                }
                else {
                    return 0;
                }
            });
        }
        for (const [_, circonscriptionData] of partyResults.entries()) {
            const nbCandidates = circonscriptionData.candidats.length;
            if (nbCandidates >= 2) {
                const [first, second] = circonscriptionData.candidats;
                first.nbVoteAvance = first.nbVoteTotal - second.nbVoteTotal;
            }
            else if (nbCandidates === 1) {
                const onlyCandidate = circonscriptionData.candidats[0];
                onlyCandidate.nbVoteAvance = onlyCandidate.nbVoteTotal;
            }
        }
        const circonscriptions = Array.from(partyResults.values())
            .sort((a, b) => a.nomCirconscription > b.nomCirconscription ? 1 : -1);
        const nbCirconscription = TOTAL_NB_SEATS;
        const nbCirconscriptionAvecResultat = circonscriptions.reduce((accumulator, circonscriptionData) => {
            return accumulator + (circonscriptionData.nbVoteExerce > 0 ? 1 : 0);
        }, 0);
        const nbCirconscriptionSansResultat = nbCirconscription - nbCirconscriptionAvecResultat;
        const nbVoteExerce = circonscriptions.reduce((accumulator, circonscriptionData) => {
            return accumulator + circonscriptionData.nbVoteExerce;
        }, 0);
        const nbVoteValide = circonscriptions.reduce((accumulator, circonscriptionData) => {
            return accumulator + circonscriptionData.nbVoteValide;
        }, 0);
        const computeStatsForParties = (circonscriptionMap) => {
            const parties = new Map();
            for (const [_, circonscriptionData] of circonscriptionMap.entries()) {
                for (const candidat of circonscriptionData.candidats) {
                    const nomPartiPolitique = candidat.nomPartiPolitique;
                    if (!parties.has(nomPartiPolitique)) {
                        parties.set(nomPartiPolitique, {
                            abreviationPartiPolitique: getAbbreviationForParty(nomPartiPolitique),
                            nbCirconscriptionsEnAvance: 0,
                            nbVoteTotal: 0,
                            nomPartiPolitique,
                            numeroPartiPolitique: -1,
                            tauxCirconscriptionsEnAvance: 0,
                            tauxVoteTotal: 0
                        });
                    }
                }
            }
            for (const [_, circonscriptionData] of circonscriptionMap.entries()) {
                for (const candidat of circonscriptionData.candidats) {
                    const nomPartiPolitique = candidat.nomPartiPolitique;
                    const partyStats = parties.get(nomPartiPolitique);
                    partyStats.nbVoteTotal += candidat.nbVoteTotal;
                    partyStats.tauxVoteTotal = nbVoteValide > 0
                        ? partyStats.nbVoteTotal * 100 / nbVoteValide
                        : 0;
                }
                const nbCandidates = circonscriptionData.candidats.length;
                if (nbCandidates === 1
                    || (nbCandidates >= 2 && circonscriptionData.candidats[0].nbVoteAvance > 0)) {
                    const nomPartiPolitique = circonscriptionData.candidats[0].nomPartiPolitique;
                    parties.get(nomPartiPolitique).nbCirconscriptionsEnAvance++;
                }
            }
            for (const [_, partyData] of parties.entries()) {
                partyData.tauxCirconscriptionsEnAvance = partyData.nbCirconscriptionsEnAvance * 100 / TOTAL_NB_SEATS;
            }
            return Array.from(parties.values())
                .sort((a, b) => {
                if (a.nbCirconscriptionsEnAvance > b.nbCirconscriptionsEnAvance) {
                    return -1;
                }
                else if (a.nbCirconscriptionsEnAvance < b.nbCirconscriptionsEnAvance) {
                    return 1;
                }
                else {
                    return 0;
                }
            });
        };
        const statistiques = {
            isResultatsFinaux: Array.from(validatedCirconscriptions.keys()).length === nbCirconscription,
            iso8601DateMAJ,
            nbBureauVote: -1,
            nbBureauVoteRempli: -1,
            nbCirconscription,
            nbCirconscriptionAvecResultat,
            nbCirconscriptionSansResultat,
            nbElecteurInscrit: -1,
            nbVoteExerce,
            nbVoteRejete: circonscriptions.reduce((accumulator, circonscriptionData) => {
                return accumulator + circonscriptionData.nbVoteRejete;
            }, 0),
            nbVoteValide,
            partisPolitiques: computeStatsForParties(partyResults),
            tauxBureauVoteRempli: -1,
            tauxCirconscriptionSansResultat: nbCirconscriptionSansResultat * 100 / nbCirconscription,
            tauxParticipationTotal: (nbVoteExerce * 100 / TOTAL_NB_REGISTERED_ELECTORS).toFixed(1)
        };
        return {
            circonscriptions,
            statistiques
        };
    }
    function getAbbreviationForParty(partyName) {
        switch (partyName) {
            case 'Animal Protection Party':
                return 'A.P.P.';
            case 'Bloc Québécois':
                return 'Bloc';
            case 'CFF - Canada\'s Fourth Front':
                return 'C.F.F.';
            case 'Christian Heritage Party':
                return 'C.H.P.';
            case 'Communist':
                return 'Communist';
            case 'Conservative':
                return 'Conservative';
            case 'Green Party':
                return 'Green';
            case 'Liberal':
                return 'Liberal';
            case 'Libertarian':
                return 'L.P.';
            case 'ML':
                return 'M.-L.P.';
            case 'National Citizens Alliance':
                return 'N.C.A.';
            case 'Nationalist':
                return 'C.N.P.';
            case 'NDP-New Democratic Party':
                return 'N.D.P.';
            case 'PC Party':
                return 'PC Party';
            case 'Pour l\'Indépendance du Québec':
                return 'P.I.Qc.';
            case 'Parti Rhinocéros Party':
                return 'P.R.';
            case 'People\'s Party':
                return 'People\'s Party';
            case 'Progressive Canadian Party':
                return 'P.C.P.';
            case 'Radical Marijuana':
                return 'R.M.';
            case 'Stop Climate Change':
                return 'S.C.C.';
            case 'UPC':
                return 'U.P.C.';
            case 'VCP':
                return 'V.C.P.';
            case 'No Affiliation':
            case 'Independent':
            default:
                return partyName;
        }
    }

    async function getRawResults() {
        const response = await fetch('https://cors-anywhere.herokuapp.com/https://enr.elections.ca/DownloadResults.aspx?_=' + Date.now(), {
            headers: {
                'X-Requested-With': 'election-results'
            },
            cache: 'no-cache'
        });
        return response.text();
    }
    function formatRawResults(rawResults) {
        return rawResults.split('\n')
            .filter((line, lineIndex, allLines) => {
            return lineIndex > 1 && lineIndex < allLines.length - 4 && line.length > 0;
        })
            .map(line => {
            const [electoralDistrictNumber, electoralDistrictName, electoralDistrictNameFr, typeOfResults, typeOfResultsFr, surname, middleName, givenName, politicalAffiliation, politicalAffiliationFr, votesObtained, percentVotesObtained, rejectedBallots, totalNumberOfBallotsCast] = line.split('\t');
            return {
                electoralDistrictNumber: parseInt(electoralDistrictNumber, 10),
                electoralDistrictName,
                typeOfResults: typeOfResults.toLowerCase() === 'validated' ? 'validated' : 'preliminary',
                surname,
                middleName,
                givenName,
                politicalAffiliation,
                votesObtained: parseInt(votesObtained, 10),
                percentVotesObtained: parseFloat(percentVotesObtained),
                rejectedBallots: parseInt(rejectedBallots, 10),
                totalNumberOfBallotsCast: parseInt(totalNumberOfBallotsCast, 10)
            };
        });
    }

    function generateColorGradient(from, to, nbSteps) {
        const parsedFrom = from.replace('#', '');
        const splitFrom = [
            parseInt(parsedFrom.substr(0, 2), 16),
            parseInt(parsedFrom.substr(2, 2), 16),
            parseInt(parsedFrom.substr(4, 2), 16)
        ];
        const parsedTo = to.replace('#', '');
        const splitTo = [
            parseInt(parsedTo.substr(0, 2), 16),
            parseInt(parsedTo.substr(2, 2), 16),
            parseInt(parsedTo.substr(4, 2), 16)
        ];
        const colorRanges = [
            splitTo[0] - splitFrom[0],
            splitTo[1] - splitFrom[1],
            splitTo[2] - splitFrom[2]
        ];
        const gradientColors = [];
        for (let i = 0; i <= nbSteps; ++i) {
            const colorStep = [
                Math.floor(splitFrom[0] + colorRanges[0] * i / nbSteps).toString(16),
                Math.floor(splitFrom[1] + colorRanges[1] * i / nbSteps).toString(16),
                Math.floor(splitFrom[2] + colorRanges[2] * i / nbSteps).toString(16)
            ];
            gradientColors.push(`#${colorStep.join('')}`);
        }
        return gradientColors;
    }

    class Application {
        constructor() {
            this.VotesChart = null;
            this.SeatsChart = null;
            this.SelectedRidingID = -1;
            this.Ridings = [];
            this.MAX_PARTIES_COUNT_FOR_CHARTS = 8;
            this.installListeners();
            this.fetchData();
        }
        setupCharts() {
            const initialData = [];
            const createChartConfig = (gradientFrom, gradientTo) => {
                const colorPalette = generateColorGradient(gradientFrom, gradientTo, this.MAX_PARTIES_COUNT_FOR_CHARTS);
                return {
                    type: 'doughnut',
                    data: {
                        datasets: [{
                                data: initialData,
                                borderWidth: Array(this.MAX_PARTIES_COUNT_FOR_CHARTS + 3).fill(0),
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
            const seatsCanvas = document.getElementById('seats');
            if (seatsCanvas !== null) {
                this.SeatsChart = new Chart(seatsCanvas, createChartConfig('#da4d60', '#e5e5e5'));
            }
            const votesCanvas = document.getElementById('votes');
            if (votesCanvas !== null) {
                this.VotesChart = new Chart(votesCanvas, createChartConfig('#6933b9', '#e5e5e5'));
            }
        }
        installListeners() {
            const ridingsDropDownElement = document.getElementById('ridings-list');
            if (ridingsDropDownElement !== null) {
                ridingsDropDownElement.addEventListener('change', e => {
                    this.SelectedRidingID = parseInt(ridingsDropDownElement.options[ridingsDropDownElement.selectedIndex].value, 10);
                    const selectedRiding = this.Ridings.filter(riding => riding.numeroCirconscription === this.SelectedRidingID);
                    this.updateRiding(selectedRiding[0]);
                });
            }
        }
        async fetchData() {
            try {
                const rawResults = await getRawResults();
                const lines = await formatRawResults(rawResults);
                const data = buildResultsFromCSVData(lines);
                this.onResultsLoaded(data);
            }
            catch (ex) {
                console.error(ex);
            }
            finally {
                setTimeout(() => {
                    this.fetchData();
                }, REFRESH_INTERVAL);
            }
        }
        onResultsLoaded(results) {
            const sortedParties = [...results.statistiques.partisPolitiques]
                .sort((a, b) => {
                if (a.nbCirconscriptionsEnAvance > b.nbCirconscriptionsEnAvance) {
                    return -1;
                }
                else if (a.nbCirconscriptionsEnAvance < b.nbCirconscriptionsEnAvance) {
                    return 1;
                }
                else {
                    if (a.nbVoteTotal > b.nbVoteTotal) {
                        return -1;
                    }
                    else if (a.nbVoteTotal < b.nbVoteTotal) {
                        return 1;
                    }
                    else {
                        if (a.nomPartiPolitique > b.nomPartiPolitique) {
                            return 1;
                        }
                        else if (a.nomPartiPolitique < b.nomPartiPolitique) {
                            return -1;
                        }
                        else {
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
            this.Ridings = results.circonscriptions;
            this.updateOverviewStats(results);
            this.updateStationsRidingsResults(results);
            this.updateRidings(results);
            if (this.SeatsChart === null && this.VotesChart === null) {
                this.setupCharts();
            }
            this.drawVotesChart(results);
            this.drawSeatsChart(results);
        }
        updateOverviewStats(results) {
            const resultCards = document.querySelectorAll('.result-card');
            const nbResults = Math.min(resultCards.length, results.statistiques.partisPolitiques.length);
            for (let i = 0; i < nbResults; ++i) {
                const party = results.statistiques.partisPolitiques[i];
                if (party.tauxCirconscriptionsEnAvance > 0) {
                    const resultCard = resultCards[i];
                    const partyName = resultCard.querySelector('.party-name');
                    if (partyName !== null) {
                        partyName.innerText = party.abreviationPartiPolitique;
                    }
                    const seatCounter = resultCard.querySelector('.count');
                    if (seatCounter !== null) {
                        seatCounter.innerText = party.nbCirconscriptionsEnAvance.toString();
                    }
                    const seatsLabel = resultCard.querySelector('.seats-label');
                    if (seatsLabel !== null) {
                        seatsLabel.innerText = `seat${party.nbCirconscriptionsEnAvance > 1 ? 's' : ''}`;
                    }
                    const voteProgressBar = resultCard.querySelector(`.dashbg-${i + 1}`);
                    if (voteProgressBar !== null) {
                        voteProgressBar.style.width = `${party.tauxCirconscriptionsEnAvance}%`;
                    }
                }
            }
        }
        updateStationsRidingsResults(results) {
            const { statistiques } = results;
            const stationsResults = document.querySelector('.stations-results');
            if (stationsResults !== null) {
                const count = stationsResults.querySelector('.count');
                if (count !== null && statistiques.nbBureauVoteRempli >= 0) {
                    count.innerText = statistiques.nbBureauVoteRempli.toLocaleString();
                }
                const progressBar = stationsResults.querySelector('div[role="progressbar"]');
                if (progressBar !== null) {
                    progressBar.style.width = `${statistiques.tauxBureauVoteRempli}%`;
                }
            }
            const ridingsResults = document.querySelector('.ridings-results');
            if (ridingsResults !== null) {
                const count = ridingsResults.querySelector('.count');
                if (count !== null) {
                    count.innerText = statistiques.nbCirconscriptionAvecResultat.toLocaleString();
                }
                const progressBar = ridingsResults.querySelector('div[role="progressbar"]');
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
            const lastUpdatedDate = document.getElementById('last-update-date');
            const lastUpdateTime = document.getElementById('last-update-time');
            if (lastUpdatedDate !== null && lastUpdateTime !== null) {
                const lastUpdateDate = new Date(Date.parse(statistiques.iso8601DateMAJ.replace(',', '.')));
                lastUpdatedDate.innerText = lastUpdateDate.toLocaleDateString();
                lastUpdateTime.innerText = lastUpdateDate.toLocaleTimeString();
            }
        }
        drawSeatsChart(results) {
            const { statistiques } = results;
            const sortedPartiesWithSeats = [...statistiques.partisPolitiques]
                .filter(party => party.nbVoteTotal > 0)
                .sort((a, b) => {
                if (a.nbCirconscriptionsEnAvance > b.nbCirconscriptionsEnAvance) {
                    return -1;
                }
                else if (a.nbCirconscriptionsEnAvance > b.nbCirconscriptionsEnAvance) {
                    return 1;
                }
                else {
                    return 0;
                }
            });
            let seats = [];
            let labels = [];
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
            }
            else {
                seats = sortedPartiesWithSeats.map(party => party.nbCirconscriptionsEnAvance);
                labels = sortedPartiesWithSeats.map(party => party.abreviationPartiPolitique);
            }
            seats.push(0);
            seats.push(TOTAL_NB_SEATS - seats
                .reduce((accumulator, partyVotes) => accumulator + partyVotes, 0));
            if (this.SeatsChart !== null) {
                this.SeatsChart.data.labels = labels;
                this.SeatsChart.data.datasets[0].data = seats;
                this.SeatsChart.options.elements.center.text = labels[0];
                this.SeatsChart.update();
            }
            const leadingPartyLabel = document.getElementById('leading-party-by-seats');
            if (leadingPartyLabel !== null && labels.length > 0) {
                leadingPartyLabel.innerText = labels[0];
            }
        }
        drawVotesChart(results) {
            const { statistiques } = results;
            const sortedPartiesWithVotes = [...statistiques.partisPolitiques]
                .filter(party => party.nbVoteTotal > 0)
                .sort((a, b) => {
                if (a.nbVoteTotal > b.nbVoteTotal) {
                    return -1;
                }
                else if (a.nbVoteTotal > b.nbVoteTotal) {
                    return 1;
                }
                else {
                    return 0;
                }
            });
            let votes = [];
            let labels = [];
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
            }
            else {
                votes = sortedPartiesWithVotes.map(party => party.nbVoteTotal);
                labels = sortedPartiesWithVotes.map(party => party.abreviationPartiPolitique);
            }
            votes.push(0);
            votes.push(TOTAL_NB_REGISTERED_ELECTORS - votes
                .reduce((accumulator, partyVotes) => accumulator + partyVotes, 0));
            if (this.VotesChart !== null) {
                this.VotesChart.data.labels = labels;
                this.VotesChart.data.datasets[0].data = votes;
                this.VotesChart.options.elements.center.text = labels[0];
                this.VotesChart.update();
            }
            const leadingPartyLabel = document.getElementById('leading-party-by-votes');
            if (leadingPartyLabel !== null && labels.length > 0) {
                leadingPartyLabel.innerText = labels[0];
            }
        }
        updateRidings(results) {
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
            if (this.SelectedRidingID !== -1) {
                const selectedRiding = results.circonscriptions
                    .filter(riding => riding.numeroCirconscription === this.SelectedRidingID);
                this.updateRiding(selectedRiding[0]);
            }
            else if (results.circonscriptions.length > 0) {
                this.updateRiding(results.circonscriptions[0]);
            }
        }
        updateRiding(riding) {
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

    Chart.pluginService.register({
        beforeDraw: (chart) => {
            const centerConfig = chart.config.options.elements.center;
            if (centerConfig) {
                const { ctx } = chart.chart;
                const fontStyle = centerConfig.fontStyle || 'Arial';
                const text = centerConfig.text || '';
                const color = centerConfig.color || '#000';
                const verticalOffset = centerConfig.verticalOffset || 12;
                if (text !== '') {
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
                    const centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;
                    ctx.font = `bolder 1.5rem ${fontStyle}`;
                    ctx.fillStyle = color;
                    ctx.fillText(text, centerX, centerY - verticalOffset);
                    const ctx2 = chart.chart.ctx;
                    ctx2.font = `normal 300 1rem ${fontStyle}`;
                    ctx2.fillText('LEADING', centerX, centerY + verticalOffset);
                }
                else {
                    const centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
                    const centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = `normal 300 1rem ${fontStyle}`;
                    ctx.fillStyle = color;
                    ctx.fillText('(NO RESULTS YET)', centerX, centerY);
                }
            }
        }
    });
    const app = new Application();

}());
//# sourceMappingURL=bundle.std.js.map
