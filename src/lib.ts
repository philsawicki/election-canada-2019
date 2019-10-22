/**
 * Fetch results from Elections Canada.
 *
 * @returns A Promise to be fulfilled with the tab-delimited content text
 * content of the raw election results.
 */
export async function getRawResults() {
    const response = await fetch('https://cors-anywhere.herokuapp.com/https://enr.elections.ca/DownloadResults.aspx?_=' + Date.now(), {
        headers: {
            'X-Requested-With': 'canada-election-results'
        },
        cache: 'no-cache'
    });
    return response.text();
}

/**
 * Parse the given CSV data into view model data.
 *
 * @param rawResults Parse data from raw CSV data.
 * @return The raw data parsed from the given CSV data.
 */
export function formatRawResults(rawResults: string): ICSVResultLine[] {
    return rawResults.split('\n')
        .filter((line, lineIndex, allLines) => {
            return lineIndex > 1 && lineIndex < allLines.length - 4 && line.length > 0;
        })
        .map(line => {
            const [
                electoralDistrictNumber,
                electoralDistrictName,
                electoralDistrictNameFr,
                typeOfResults,
                typeOfResultsFr,
                surname,
                middleName,
                givenName,
                politicalAffiliation,
                politicalAffiliationFr,
                votesObtained,
                percentVotesObtained,
                rejectedBallots,
                totalNumberOfBallotsCast ] = line.split('\t');

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
