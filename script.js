// cyrb53 hashing function.
function hash(str, seed = 0) {
    let h1 = 0xdeadbeef ^ seed;
    let h2 = 0x41c6ce57 ^ seed;

    for (let i = 0, ch; i < str.length; ++i) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }

    h1 = Math.imul(h1 ^ h1 >>> 16, 2246822507) ^ Math.imul(h2 ^ h2 >>> 13, 3266489909);
    h2 = Math.imul(h2 ^ h2 >>> 16, 2246822507) ^ Math.imul(h1 ^ h1 >>> 13, 3266489909);

    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

async function getRawResults() {
    const response = await fetch('https://cors-anywhere.herokuapp.com/https://enr.elections.ca/DownloadResults.aspx', {
        headers: {
            'X-Requested-With': 'sas'
        },
        cache: 'no-cache'
    });
    return response.text();
}

async function formatRawResults() {
    const rawResults = await getRawResults();

    const allLines = rawResults.split('\n');
    return allLines
        .filter((_, lineNumber) =>  lineNumber > 1 && lineNumber < allLines.length - 4)
        .map(line => {
            const [
                electoralDistrictNumber,
                electoralDistrictName,
                electoralDistrictName2,
                typeOfResults,
                typeOfResults2,
                surname,
                middleName,
                givenName,
                politicalAffiliation,
                politicalAffiliation2,
                votesObtained,
                percentVotesObtained,
                rejectedBallots,
                totalNumberOfBallotsCast ] = line.split('\t');

            return {
                electoralDistrictNumber: parseInt(electoralDistrictNumber, 10),
                electoralDistrictName,
                typeOfResults,
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

function groupResultsPerDistrict(lineResults) {
    const uniqueDistrictNumbers = new Set();
    lineResults.map(lineResult => {
        uniqueDistrictNumbers.add(lineResult.electoralDistrictNumber);
    });

    const resultsPerDistrict = new Map();
    for (const uniqueDistrictNumber of uniqueDistrictNumbers) {
        const districtResults = lineResults
            .filter(lineResult => {
                return lineResult.electoralDistrictNumber === uniqueDistrictNumber;
            })
            .sort((a, b) => {
                if (a.typeOfResults === 'preliminary' && b.typeOfResults === a.typeOfResults) {
                    if (a.votesObtained > b.votesObtained) {
                        return -1;
                    } else if (a.votesObtained < b.votesObtained) {
                        return 1;
                    } else {
                        return 0;
                    }
                } else if (a.typeOfResults === 'validated' && b.typeOfResults === a.typeOfResults) {
                    if (a.votesObtained > b.votesObtained) {
                        return -1;
                    } else if (a.votesObtained < b.votesObtained) {
                        return 1;
                    } else {
                        return 0;
                    }
                } else if (a.typeOfResults === 'validated') { // b is "preliminary"
                    return -1;
                } else {
                    return 1; // a is "preliminary" and b is "validated"
                }
            });

        if (districtResults.length > 0) {
            const districtData = {
                districtResults,
                hasResults: districtResults.length > 0,
                hasValidatedResult: districtResults
                    .filter(r => r.typeOfResults === 'validated').length > 0,
                hasPreliminaryResult: districtResults
                    .filter(r => r.typeOfResults === 'preliminary').length > 0,
                leadingAffiliation: districtResults[0].politicalAffiliation,
                leadingCandidate: `${districtResults[0].surname} ${districtResults[0].middleName} ${districtResults[0].givenName}`
            };

            resultsPerDistrict.set(uniqueDistrictNumber, districtData);
        }
    }

    return resultsPerDistrict;
}

async function processRawResults() {
    const lines = await formatRawResults();

    const groupedResultsPerDistrict = groupResultsPerDistrict(lines);
    // console.log(groupedResultsPerDistrict);

    const seatsPerParty = new Map();
    for (const [ districtNumber, districtData ] of groupedResultsPerDistrict.entries()) {
        const party = districtData.districtResults[0].politicalAffiliation;
        const seatsForParty = seatsPerParty.has(party)
            ? seatsPerParty.get(party)
            : 0;
        seatsPerParty.set(party, seatsForParty + 1);
    }
    console.log(seatsPerParty);

    onDOMReady(() => {
        const resultsListElement = document.getElementById('results');
        if (resultsListElement !== null) {
            let resultsTemplate = '';
            for (const [ districtNumber, districtData ] of groupedResultsPerDistrict.entries()) {
                const firstResult = districtData.districtResults[0];
                resultsTemplate +=
                    `<tr>
                        <td colspan="10">
                            ${firstResult.electoralDistrictName} (#${firstResult.electoralDistrictNumber}):
                            ${firstResult.totalNumberOfBallotsCast.toLocaleString()} ballots cast, ${firstResult.rejectedBallots.toLocaleString()} rejected
                        </td>
                    </tr>`;
                for (const line of districtData.districtResults) {
                    resultsTemplate +=
                        `<tr>
                            <!-- <td class="text-right">${line.electoralDistrictNumber}</td> -->
                            <!-- <td>${line.electoralDistrictName}</td> -->
                            <td>${line.typeOfResults}</td>
                            <!-- <td>${line.surname}</td> -->
                            <!-- <td>${line.middleName}</td> -->
                            <!-- <td>${line.givenName}</td> -->
                            <td>${line.givenName} ${line.middleName} ${line.surname}</td>
                            <td>${line.politicalAffiliation}</td>
                            <td class="text-right">${line.votesObtained.toLocaleString()}</td>
                            <td class="text-right">${line.percentVotesObtained.toFixed(1)}%</td>
                            <!-- <td class="text-right">${line.rejectedBallots.toLocaleString()}</td> -->
                            <!-- <td class="text-right">${line.totalNumberOfBallotsCast.toLocaleString()}</td> -->
                        </tr>`;
                }
            }
            resultsListElement.innerHTML = resultsTemplate;
        }

        const lastUpdatedElement = document.getElementById('last-updated');
        if (lastUpdatedElement !== null) {
            const lastUpdateTime = new Date();
            lastUpdatedElement.innerText = `${lastUpdateTime.toLocaleDateString()} @ ${lastUpdateTime.toLocaleTimeString()}`;
        }

        setTimeout(processRawResults, 60 * 1000);
    });
}


// function onDOMReady(fn) {
//     if (document.readyState !== 'loading') {
//         fn();
//     } else {
//         document.addEventListener('DOMContentLoaded', fn);
//     }
// }


(() => {
    processRawResults();
})();
