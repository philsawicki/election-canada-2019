type ResultType = 'preliminary' | 'validated';

interface ICSVResultLine {
    electoralDistrictNumber: number;
    electoralDistrictName: string;
    typeOfResults: ResultType;
    surname: string;
    middleName: string;
    givenName: string;
    politicalAffiliation: string;
    votesObtained: number;
    percentVotesObtained: number;
    rejectedBallots: number;
    totalNumberOfBallotsCast: number;
}

interface IDistrictData {
    districtResults: ICSVResultLine[];
    hasResults: boolean;
    hasValidatedResult: boolean;
    hasPreliminaryResult: boolean;
    hasLead: boolean;
    leadingAffiliation: string | null;
    leadingCandidate: string | null;
}


declare interface ChartDataset {
    data: number[];
    borderAlign?: 'center' | 'inner';
    borderColor?: string;
    borderWidth?: number[];
    backgroundColor?: string[];
    hoverBackgroundColor?: string[];
    hoverBorderColor?: string[];
    hoverBorderWidth?: number[];
    label?: string;
    weight?: number;
}

declare class ChartPluginService {
    register: ({ }) => void;
}

declare class Chart {
    constructor(selector: CanvasRenderingContext2D | HTMLCanvasElement, options: {
        type: 'doughnut' | 'pie' | string,
        data: {
            datasets: ChartDataset[],
            labels?: string[];
        },
        options: {
            responsive?: boolean;
            cutoutPercentage?: number;
            rotation?: number;
            circumference?: number;
            legend?: {
                position?: 'top' | 'bottom' | 'left' | 'right' | string;
                display?: boolean;
            },
            title?: {
                display?: boolean;
                text?: string;
            },
            animation?: {
                animaeScale?: boolean;
                animateRotate?: boolean;
            }
        }
    });
    update: () => void;
    data: {
        labels: string[];
        datasets: ChartDataset[]
    };
    options: {
        elements: {
            center?: {
                text: string;
            }
        }
    }
    static pluginService: ChartPluginService;
}




/**
 * Data structure for a candidate coming from Élections Québec.
 */
declare interface Candidat {
    /**
     * Contains the abbreviation of the political party.
     */
    abreviationPartiPolitique: string;
    /**
     * Indicates the lead in number of votes for the first placed candidate over
     * the second in their electoral division. 0 is used if the candidate is not
     * leading.
     */
    nbVoteAvance: number;
    /**
     * Indicates the number of votes for the candidate in their electoral
     * division.
     */
    nbVoteTotal: number;
    /**
     * Contains the candidate's family name.
     */
    nom: string;
    /**
     * Contains the name of the political party.
     */
    nomPartiPolitique: string;
    /**
     * Indicates the candidate's number. It is purely an administrative number.
     */
    numeroCandidat: number;
    /**
     * Contains the candidate's political party number so that he or she can be
     * linked to their political party.
     */
    numeroPartiPolitique: number;
    /**
     * Contains the candidate's first name.
     */
    prenom: string;
    /**
     * Indicates the percentage of votes for the candidate in their electoral
     * division.
     */
    tauxVote: number;
}


/**
 * Data structure for an electoral division coming from Élections Québec.
 */
declare interface Circonscription {
    /**
     * Contains the list of candidates in the electoral division with their
     * political party affiliation.
     */
    candidats: Candidat[];
    /**
     * Is "true" if the results are final or is "false" if otherwise.
     */
    isResultatsFinaux: boolean;
    /**
     * Contains the last update in ISO 8601 format of statistics for this
     * electoral division.
     */
    iso8601DateMAJ: string;
    /**
     * Indicates the number of polling stations that have finished counting and
     * been entered into the system.
     */
    nbBureauComplete: number;
    /**
     * Indicates the total number of polling stations in the electoral division.
     */
    nbBureauTotal: number;
    /**
     * Indicates the number of registered electors in the electoral division.
     */
    nbElecteurInscrit: number;
    /**
     * Indicates the number of votes cast in the electoral division.
     */
    nbVoteExerce: number;
    /**
     * Indicates the number of rejected votes in the electoral division.
     */
    nbVoteRejete: number;
    /**
     * Indicates the number of valid votes in the electoral division.
     */
    nbVoteValide: number;
    /**
     * Contains the name of the electoral division.
     */
    nomCirconscription: string;
    /**
     * Indicates the number of the electoral division.
     */
    numeroCirconscription: number;
    /**
     * Indicates the turnout in the electoral division.
     */
    tauxParticipation: string | 'n.d.';
    /**
     * Indicates the percentage of rejected votes in the electoral division.
     */
    tauxVoteRejete: number;
    /**
     * Indicates the percentage of valid votes in the electoral division.
     */
    tauxVoteValide: number;
}


/**
 * Data structure for a political party coming from Élections Québec.
 */
declare interface PartiPolitique {
    /**
     * Contains the abbreviation of the political party.
     */
    abreviationPartiPolitique: string;
    /**
     * Indicates the number of electoral divisions in which the political party
     * is leading.
     */
    nbCirconscriptionsEnAvance: number;
    /**
     * Indicates the number of votes that the political party has received so
     * far in all electoral divisions combined.
     */
    nbVoteTotal: number;
    /**
     * Contains the political party's name.
     */
    nomPartiPolitique: string;
    /**
     * Indicates the number of the political party. It is merely an
     * administrative number and is used to link a political party to one or
     * more candidates.
     */
    numeroPartiPolitique: number;
    /**
     * Indicates the percentage of electoral divisions in which the political
     * party is leading.
     */
    tauxCirconscriptionsEnAvance: number;
    /**
     * Indicates the percentage of votes that the political party has received
     * so far in all electoral divisions combined.
     */
    tauxVoteTotal: number;
}


/**
 * Data structure for the results coming from Élections Québec.
 */
declare interface Results {
    /**
     * Contains the list of electoral divisions with their candidates as well as
     * the statistics attached to these electoral divisions and these candidates.
     */
    circonscriptions: Circonscription[];
    /**
     * Contains various statistics about the election in progress.
     */
    statistiques: {
        /**
         * Is "true" if the results are final or is "false" if not.
         */
        isResultatsFinaux: boolean;
        /**
         * Contains the last update in ISO 8601 format of statistics.
         */
        iso8601DateMAJ: string;
        /**
         * Indicates the number of polling stations in the election.
         */
        nbBureauVote: number;
        /**
         * Indicates the number of polling stations which have been counted and
         * entered into the system.
         */
        nbBureauVoteRempli: number;
        /**
         * Indicates the number of electoral divisions.
         */
        nbCirconscription: number;
        /**
         * Indicates the number of electoral divisions with results already
         * entered in the system.
         */
        nbCirconscriptionAvecResultat: number;
        /**
         * Indicates the number of electoral divisions without results entered
         * in the system.
         */
        nbCirconscriptionSansResultat: number;
        /**
         * Indicates the number of electors registered on the list of electors
         * at the time of the vote.
         */
        nbElecteurInscrit: number;
        /**
         * Indicates the number of votes cast (number of valid votes plus the
         * number of rejected votes) currently counted in the election.
         */
        nbVoteExerce: number;
        /**
         * Indicates the number of rejected votes currently counted in the
         * election.
         */
        nbVoteRejete: number;
        /**
         * Indicates the number of valid votes currently counted in the
         * election.
         */
        nbVoteValide: number;
        /**
         * Contains the list of political parties including various information
         * and statistics about them.
         */
        partisPolitiques: PartiPolitique[];
        /**
         * Indicates the percentage of polling stations which have been counted
         * and entered into the system.
         */
        tauxBureauVoteRempli: number;
        /**
         * Indicates the percentage of electoral divisions without results
         * entered in the system.
         */
        tauxCirconscriptionSansResultat: number;
        /**
         * Indicates the expected turnout at the end of the election if the
         * current trend holds.
         */
        tauxParticipationTotal: string;
    };
}
