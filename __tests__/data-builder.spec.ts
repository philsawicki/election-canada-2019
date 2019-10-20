import { buildResultsFromCSVData, getAbbreviationForParty } from '../src/data-builder';
import { formatRawResults } from '../src/lib';
import { COMPOSITE_AGGREGATE_RESULTS, NANAIMO_2019_RESULTS } from './content';


describe('data-builder', () => {
    describe('#buildResultsFromCSVData', () => {
        describe('ridings', () => {
            it('has valid circonscription data', () => {
                const formattedResults = formatRawResults(NANAIMO_2019_RESULTS);
                const { circonscriptions } = buildResultsFromCSVData(formattedResults);

                expect(circonscriptions).toHaveLength(1);

                expect(circonscriptions[0].nomCirconscription).toEqual('Nanaimo--Ladysmith');
                expect(circonscriptions[0].numeroCirconscription).toEqual(59018);
                expect(circonscriptions[0].nbVoteExerce).toEqual(41195);
                expect(circonscriptions[0].nbVoteRejete).toEqual(130);
                expect(circonscriptions[0].nbVoteValide).toEqual(41065);
                expect(circonscriptions[0].candidats).toHaveLength(7);

                const [ firstCandidate, secondCandidate ] = circonscriptions[0].candidats;

                expect(firstCandidate).toEqual({
                    abreviationPartiPolitique: 'Green',
                    nbVoteAvance: 5087,
                    nbVoteTotal: 15302,
                    nom: 'Manly',
                    nomPartiPolitique: 'Green Party',
                    numeroCandidat: -1,
                    numeroPartiPolitique: -1,
                    prenom: 'Paul',
                    tauxVote: 37.3
                });

                expect(secondCandidate.nbVoteAvance).toEqual(0);
            });

            it('has valid circonscription data with multiple parties', () => {
                const formattedResults = formatRawResults(COMPOSITE_AGGREGATE_RESULTS);
                const { circonscriptions } = buildResultsFromCSVData(formattedResults);

                expect(circonscriptions).toHaveLength(5);

                expect(circonscriptions[4].nomCirconscription).toEqual('Nanaimo--Ladysmith');
                expect(circonscriptions[4].numeroCirconscription).toEqual(59018);
                expect(circonscriptions[4].nbVoteExerce).toEqual(41195);
                expect(circonscriptions[4].nbVoteRejete).toEqual(130);
                expect(circonscriptions[4].nbVoteValide).toEqual(41065);

                expect(circonscriptions[4].candidats).toHaveLength(7);
                const [ firstCandidate, secondCandidate ] = circonscriptions[4].candidats;

                expect(firstCandidate).toEqual({
                    abreviationPartiPolitique: 'Green',
                    nbVoteAvance: 5087,
                    nbVoteTotal: 15302,
                    nom: 'Manly',
                    nomPartiPolitique: 'Green Party',
                    numeroCandidat: -1,
                    numeroPartiPolitique: -1,
                    prenom: 'Paul',
                    tauxVote: 37.3
                });

                expect(secondCandidate.nbVoteAvance).toEqual(0);
            });
        });

        describe('statistics', () => {
            it('has valid statistics', () => {
                const formattedResults = formatRawResults(NANAIMO_2019_RESULTS);
                const { statistiques } = buildResultsFromCSVData(formattedResults);

                expect(statistiques.nbCirconscription).toEqual(338);
                expect(statistiques.nbCirconscriptionAvecResultat).toEqual(1);
                expect(statistiques.nbCirconscriptionSansResultat).toEqual(337);
                expect(statistiques.nbVoteExerce).toEqual(41195);
                expect(statistiques.nbVoteRejete).toEqual(130);
                expect(statistiques.nbVoteValide).toEqual(41065);
                expect(statistiques.tauxCirconscriptionSansResultat).toEqual(99.70414201183432);

                expect(statistiques.partisPolitiques).toHaveLength(7);
                const [ firstLeadingParty, secondLeadingParty ] = statistiques.partisPolitiques;

                expect(firstLeadingParty).toEqual({
                    abreviationPartiPolitique: 'Green',
                    nbCirconscriptionsEnAvance: 1,
                    nbVoteTotal: 15302,
                    nomPartiPolitique: 'Green Party',
                    numeroPartiPolitique: -1,
                    tauxCirconscriptionsEnAvance: 0.2958579881656805,
                    tauxVoteTotal: 37.262875928406186
                });
                expect(secondLeadingParty).toEqual({
                    abreviationPartiPolitique: 'Conservative',
                    nbCirconscriptionsEnAvance: 0,
                    nbVoteTotal: 10215,
                    nomPartiPolitique: 'Conservative',
                    numeroPartiPolitique: -1,
                    tauxCirconscriptionsEnAvance: 0,
                    tauxVoteTotal: 24.875197857055886
                });
            });

            it('has valid statistics for multiple parties', () => {
                const formattedResults = formatRawResults(COMPOSITE_AGGREGATE_RESULTS);
                const { statistiques } = buildResultsFromCSVData(formattedResults);

                expect(statistiques.isResultatsFinaux).toEqual(false);
                expect(statistiques.nbCirconscription).toEqual(338);
                expect(statistiques.nbCirconscriptionAvecResultat).toEqual(4);
                expect(statistiques.nbCirconscriptionSansResultat).toEqual(334);
                expect(statistiques.nbVoteExerce).toEqual(44395);
                expect(statistiques.nbVoteRejete).toEqual(130);
                expect(statistiques.nbVoteValide).toEqual(44265);
                expect(statistiques.tauxCirconscriptionSansResultat).toEqual(98.81656804733728);

                expect(statistiques.partisPolitiques).toHaveLength(9);
                const [ firstLeadingParty, secondLeadingParty ] = statistiques.partisPolitiques;

                expect(firstLeadingParty).toEqual({
                    abreviationPartiPolitique: 'Fake',
                    nbCirconscriptionsEnAvance: 3,
                    nbVoteTotal: 2000,
                    nomPartiPolitique: 'Fake',
                    numeroPartiPolitique: -1,
                    tauxCirconscriptionsEnAvance: 0.8875739644970414,
                    tauxVoteTotal: 4.518242403704959
                });
                expect(secondLeadingParty).toEqual({
                    abreviationPartiPolitique: 'Green',
                    nbCirconscriptionsEnAvance: 1,
                    nbVoteTotal: 15302,
                    nomPartiPolitique: 'Green Party',
                    numeroPartiPolitique: -1,
                    tauxCirconscriptionsEnAvance: 0.2958579881656805,
                    tauxVoteTotal: 34.56907263074664
                });
            });
        });
    });

    describe('#getAbreviationForParty', () => {
        it('returns the appropriate abreviation for the given party', () => {
            const mappings = {
                'A.P.P.': ['Animal Protection Party'],
                'Bloc': ['Bloc Québécois'],
                'C.F.F.': ['CFF - Canada\'s Fourth Front'],
                'C.N.P.': ['Nationalist'],
                'C.H.P.': ['Christian Heritage Party'],
                'Communist': ['Communist'],
                'Conservative': ['Conservative'],
                'Green': ['Green Party'],
                'Liberal': ['Liberal'],
                'L.P.': ['Libertarian'],
                'M.-L.P.': ['ML'],
                'N.C.A.': ['National Citizens Alliance'],
                'N.D.P.': ['NDP-New Democratic Party'],
                'P.I.Qc.': ['Pour l\'Indépendance du Québec'],
                'P.R.': ['Parti Rhinocéros Party'],
                'People\'s Party': ['People\'s Party'],
                'R.M.': ['Radical Marijuana'],
                'P.C.P.': ['Progressive Canadian Party'],
                'S.C.C.': ['Stop Climate Change'],
                'U.P.C.': ['UPC'],
                'V.C.P.': ['VCP'],
                'Independent': ['Independent'],
                'No Affiliation': ['No Affiliation']
            };

            for (const [ abbreviation, fullNames ] of Object.entries(mappings)) {
                for (const fullName of fullNames) {
                    expect(getAbbreviationForParty(fullName)).toEqual(abbreviation);
                }
            }
        });

        it('returns the party\'s name if it is not already known', () => {
            expect(getAbbreviationForParty('xxx')).toEqual('xxx');
        });
    });
});
