/*
 * Script Name: Construction Times
 * Version: v1.0
 * Last Updated: 2024-06-24
 * Author: RedAlert
 * Author URL: https://twscripts.dev/
 * Author Contact: redalert_tw (Discord)
 * Approved: N/A
 * Approved Date: 2024-07-23
 * Mod: MKich
 */

/*--------------------------------------------------------------------------------------
 * This script can NOT be cloned and modified without permission from the script author.
 --------------------------------------------------------------------------------------*/

// User Input
if (typeof DEBUG !== 'boolean') DEBUG = false;

// Script Config
var scriptConfig = {
    scriptData: {
        prefix: 'constructionTimes',
        name: 'Construction Times',
        version: 'v1.0',
        author: 'RedAlert',
        authorUrl: 'https://twscripts.dev/',
        helpLink:
            'https://forum.tribalwars.net/index.php?threads/construction-times.292541/',
    },
    translations: {
        en_DK: {
            'Construction Times': 'Construction Times',
            Help: 'Help',
            'Redirecting...': 'Redirecting...',
            today: 'today',
            tomorrow: 'tomorrow',
            Village: 'Village',
            Building: 'Building',
            'Finish Time': 'Finish Time',
            'Time Left': 'Time Left',
            'On the table are listed only upgrades that finish within an hour.':
                'On the table are listed only upgrades that finish within an hour.',
            'No building upgrades found that finish within an hour!':
                'No building upgrades found that finish within an hour!',
            Finish: 'Finish',
            'Upgrade has finished!': 'Upgrade has finished!',
        },
    },
    allowedMarkets: [],
    allowedScreens: ['overview_villages'],
    allowedModes: ['buildings'],
    isDebug: DEBUG,
    enableCountApi: true,
};

$.getScript(
    `https://twscripts.dev/scripts/twSDK.js?url=${document.currentScript.src}`,
    async function () {
        // Initialize Library
        await twSDK.init(scriptConfig);
        const isValidScreen = twSDK.checkValidLocation('screen');
        const isValidMode = twSDK.checkValidLocation('mode');

        // Entry Point
        (function () {
            if (isValidScreen && isValidMode) {
                buildUI();
            } else {
                UI.InfoMessage(twSDK.tt('Redirecting...'));
                twSDK.redirectTo('overview_villages&mode=buildings');
            }
        })();

        // Build the user interface
        function buildUI() {
            const buildTimes = collectConstructionTimes();

            if (buildTimes.length > 0) {
                const buildTable = buildConstructionsTableHTML(buildTimes);

                const content = `
                    ${buildTable}
                    <small>${twSDK.tt(
                        'On the table are listed only upgrades that finish within an hour.'
                    )}</small>
                `;

                const customStyle = `
                    .ra-construction-times th { background-image: none; }
                    .ra-construction-times th,
                    .ra-construction-times td { text-align: center; }
                    .ra-construction-times td.ra-tal { text-align: left; }
                    .ra-green td { background-color: #9aeda4 !important; }
                    .ra-yellow td { background-color: #fff293 !important; }
                `;

                twSDK.renderBoxWidget(
                    content,
                    scriptConfig.scriptData.prefix,
                    'ra-construction-times',
                    customStyle
                );
            } else {
                UI.InfoMessage(
                    twSDK.tt(
                        'No building upgrades found that finish within an hour!'
                    )
                );
            }
        }

        // Helper: Collect construction times
        function collectConstructionTimes() {
            let villagesData = [];
            const extraDay = 60 * 60 * 24 * 1000;
            const serverTime = twSDK.getServerDateTimeObject();

            let todayPattern = new RegExp(
                window.lang['aea2b0aa9ae1534226518faaefffdaad'].replace(
                    '%s',
                    '([\\d.:]+)'
                )
            );
            let tomorrowPattern = new RegExp(
                window.lang['57d28d1b211fddbb7a499ead5bf23079'].replace(
                    '%s',
                    '([\\d.:]+)'
                )
            );

            let day = new Date().getUTCDate();
            let month = new Date().getUTCMonth() + 1;
            let year = new Date().getUTCFullYear();

            jQuery('#villages tr.vrow').each(function () {
                const villageId = jQuery(this).attr('id').replace('v_', '');
                const villageName = jQuery(this).find('td:eq(2)').text().trim();
                const constructionTime = jQuery(this)
                    .find('.order_queue #order_0 .queue_icon img')
                    .attr('data-title');

                if (typeof constructionTime !== 'undefined') {
                    villagesData.push({
                        villageId: parseInt(villageId),
                        villageName: villageName,
                        constructionTime: constructionTime.split(' - ')[1],
                        building: constructionTime.split(' - ')[0],
                    });
                }
            });

            villagesData = villagesData.map((village) => {
                const { constructionTime } = village;
                if (constructionTime.indexOf(twSDK.tt('today')) > -1) {
                    let tempTime = todayPattern.exec(constructionTime)[1];
                    let timestamp = Date.parse(
                        month + '/' + day + '/' + year + ' ' + tempTime
                    );
                    let remainingTime = (timestamp - serverTime) / 1000;
                    return {
                        ...village,
                        date: timestamp,
                        remainingTime: remainingTime,
                    };
                } else if (
                    constructionTime.indexOf(twSDK.tt('tomorrow')) > -1
                ) {
                    let tempTime = tomorrowPattern.exec(constructionTime)[1];
                    let timestamp =
                        Date.parse(
                            month + '/' + day + '/' + year + ' ' + tempTime
                        ) + extraDay;
                    let remainingTime = (timestamp - serverTime) / 1000;
                    return {
                        ...village,
                        date: timestamp,
                        remainingTime: remainingTime,
                    };
                }
            });

            villagesData = villagesData.filter((village) => {
                const { remainingTime } = village;
                if (remainingTime > 0 && remainingTime <= 3600) {
                    return village;
                }
            });

            villagesData.sort(function (left, right) {
                return left.date - right.date;
            });

            return villagesData;
        }

        // Helper: Build the constructions table HTML
        function buildConstructionsTableHTML(buildTable) {
            let html = `
                <table class="ra-table ra-table-v3" width="100%">
                    <thead>
                        <tr>
                            <th width="40%" class="ra-tal">
                                ${twSDK.tt('Village')}
                            </th>
                            <th width="20%">
                                ${twSDK.tt('Building')}
                            </th>
                            <th width="20%">
                                ${twSDK.tt('Finish Time')}
                            </th>
                            <th width="20%">
                                ${twSDK.tt('Time Left')}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            html += buildTable
                .map((village) => {
                    const {
                        villageId,
                        villageName,
                        constructionTime,
                        building,
                        remainingTime,
                    } = village;
                    const rowClass = getRemainingTimeClass(remainingTime);

                    return `
                        <tr class="${rowClass}">
                            <td width="40%" class="ra-tal">
                                <a href="/game.php?village=${villageId}&screen=main" target="_blank" rel="noreferrer noopener">
                                    ${villageName}
                                </a>
                            </td>
                            <td width="20%">
                                ${building}
                            </td>
                            <td width="20%">
                                ${constructionTime}
                            </td>
                            <td width="20%">
                                ${twSDK.timeAgo(remainingTime)}
                            </td>
                        </tr>
                    `;
                })
                .join('');

            html += `</tbody></table>`;

            return html;
        }

        // Helper: Get the remaining time CSS class based on remaining time
        function getRemainingTimeClass(remainingTime) {
            if (remainingTime <= 180) {
                return 'ra-green';
            }
            if (remainingTime <= 600) {
                return 'ra-yellow';
            }
            return '';
        }
    }
);
