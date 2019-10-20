import { formatRawResults } from '../src/lib';
import { NANAIMO_2019_RESULTS } from './content';


describe('main', () => {
    describe('#formatRawResults', () => {
        it('converts raw text results into models', () => {
            const results = formatRawResults(NANAIMO_2019_RESULTS);

            expect(Array.isArray(results)).toBeTruthy();
            expect(results).toHaveLength(14);
            expect(results[0]).toEqual({
                electoralDistrictName: 'Nanaimo--Ladysmith',
                electoralDistrictNumber: 59018,
                givenName: 'Michelle',
                middleName: '',
                percentVotesObtained: 11,
                politicalAffiliation: 'Liberal',
                rejectedBallots: 0,
                surname: 'Corfield',
                totalNumberOfBallotsCast: 40711,
                typeOfResults: 'preliminary',
                votesObtained: 4478
            });
        });
    });
});
