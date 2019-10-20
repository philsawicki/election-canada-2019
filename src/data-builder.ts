import { TOTAL_NB_REGISTERED_ELECTORS, TOTAL_NB_SEATS } from './settings';


/**
 * Build result data from the given CSV results.
 *
 * @param lineResults Viewmodel of the CSV result data.
 * @return The results built from the viewmodel of the CSV data.
 */
export function buildResultsFromCSVData(lineResults: ICSVResultLine[]): Results {
    const preliminaryCirconscriptions = new Map<number, Circonscription>();
    const validatedCirconscriptions = new Map<number, Circonscription>();
    const iso8601DateMAJ = (new Date()).toISOString();

    // Step #1: Record list of circonscriptions.
    for (const lineResult of lineResults) {
        const emptyCirconscriptionData: Circonscription = {
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
        } else if (lineResult.typeOfResults === 'validated' && !validatedCirconscriptions.has(circonscriptionNumber)) {
            emptyCirconscriptionData.isResultatsFinaux = true;
            validatedCirconscriptions.set(circonscriptionNumber, emptyCirconscriptionData);
        }
    }

    // Step #2: Record data and candidates.
    for (const lineResult of lineResults) {
        const candidate: Candidat = {
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
        } else if (lineResult.typeOfResults === 'validated') {
            validatedCirconscriptions.get(circonscriptionNumber).candidats.push(candidate);
        }
    }

    const partyResults = new Map<number, Circonscription>();
    for (const [ _, circonscriptionData ] of preliminaryCirconscriptions.entries()) {
        const circonscriptionNumber = circonscriptionData.numeroCirconscription;
        if (validatedCirconscriptions.has(circonscriptionNumber)) {
            partyResults.set(circonscriptionNumber, validatedCirconscriptions.get(circonscriptionNumber));
        } else {
            partyResults.set(circonscriptionNumber, preliminaryCirconscriptions.get(circonscriptionNumber));
        }
    }
    for (const [ _, circonscriptionData ] of validatedCirconscriptions.entries()) {
        const circonscriptionNumber = circonscriptionData.numeroCirconscription;
        if (!partyResults.has(circonscriptionNumber)) {
            partyResults.set(circonscriptionNumber, validatedCirconscriptions.get(circonscriptionNumber));
        }
    }

    // Step #3: Sort candidates.
    for (const [ _, circonscriptionData ] of partyResults.entries()) {
        circonscriptionData.candidats.sort((a, b) => {
            if (a.nbVoteTotal > b.nbVoteTotal) {
                return -1;
            } else if (a.nbVoteTotal < b.nbVoteTotal) {
                return 1;
            } else {
                return 0;
            }
        });
    }

    // Step #4: Compute votes in advance.
    for (const [ _, circonscriptionData ] of partyResults.entries()) {
        const nbCandidates = circonscriptionData.candidats.length;
        if (nbCandidates >= 2) {
            const [ first, second ] = circonscriptionData.candidats;
            first.nbVoteAvance = first.nbVoteTotal - second.nbVoteTotal;
        } else if (nbCandidates === 1) {
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
    // Compute statistics for political parties:
    const computeStatsForParties = (circonscriptionMap: Map<number, Circonscription>) => {
        const parties = new Map<string, PartiPolitique>();
        for (const [ _, circonscriptionData ] of circonscriptionMap.entries()) {
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

        for (const [ _, circonscriptionData ] of circonscriptionMap.entries()) {
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

        for (const [ _, partyData ] of parties.entries()) {
            partyData.tauxCirconscriptionsEnAvance = partyData.nbCirconscriptionsEnAvance * 100 / TOTAL_NB_SEATS;
        }

        return Array.from(parties.values())
            .sort((a, b) => {
                if (a.nbCirconscriptionsEnAvance > b.nbCirconscriptionsEnAvance) {
                    return -1;
                } else if (a.nbCirconscriptionsEnAvance < b.nbCirconscriptionsEnAvance) {
                    return 1;
                } else {
                    return 0;
                }
            });
    };

    // Step #5: Record circonscription stats.
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
        tauxParticipationTotal: (nbVoteExerce * 100 / TOTAL_NB_REGISTERED_ELECTORS).toFixed(1) // '-1.0'
    };

    return {
        circonscriptions,
        statistiques
    };
}

/**
 * Return the abbreviation for the given political party name.
 *
 * @param partyName Name of the political party for which to return the
 * abbreviation.
 * @return The abbreviation for the given political party.
 */
export function getAbbreviationForParty(partyName: string) {
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
        // case 'Marxist-Leninist Party':
        case 'ML':
            return 'M.-L.P.';
        case 'National Citizens Alliance':
            return 'N.C.A.';
        // case 'Canadian Nationalist':
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
        // case 'The United Party':
        case 'UPC':
            return 'U.P.C.';
        // case 'Veterans Coalition Party':
        case 'VCP':
            return 'V.C.P.';
        case 'No Affiliation':
        case 'Independent':
        default:
            return partyName;
    }
}
