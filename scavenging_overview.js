javascript:
var totalLootArr = [];
//scav overview by Sophie "Shinko to Kuma"
// if no one is sitting the account
if (game_data.player.sitter > 0) {
    URLReq = `game.php?t=${game_data.player.id}&screen=place&mode=scavenge_mass`;
}
else {
    URLReq = "game.php?&screen=place&mode=scavenge_mass";
}


var scavengeInfo = [];

var categoryNames;
var html = "";
//classes CSS
cssClassesSophie = `
  <style>
  .sophRowA {
  background-color: #32353b;
  color: white;
  padding:5px;
  }
  .sophRowB {
  background-color: #36393f;
  color: white;
  padding:5px;
  }
  .sophHeader {
  background-color: #202225;
  font-weight: bold;
  color: white;
  padding:5px;
  }
  </style>`
$(".content-border").eq(0).prepend(cssClassesSophie);
$("#mobileHeader").eq(0).prepend(cssClassesSophie);


$.getAll = function (
    urls, // array of URLs
    onLoad, // called when any URL is loaded, params (index, data)
    onDone, // called when all URLs successfully loaded, no params
    onError // called when a URL load fails or if onLoad throws an exception, params (error)
) {
    var numDone = 0;
    var lastRequestTime = 0;
    var minWaitTime = 200; // ms between requests
    loadNext();
    function loadNext() {
        if (numDone == urls.length) {
            onDone();
            return;
        }

        let now = Date.now();
        let timeElapsed = now - lastRequestTime;
        if (timeElapsed < minWaitTime) {
            let timeRemaining = minWaitTime - timeElapsed;
            setTimeout(loadNext, timeRemaining);
            return;
        }
        console.log('Getting ', urls[numDone]);
        $("#progress").css("width", `${(numDone + 1) / urls.length * 100}%`);
        lastRequestTime = now;
        $.get(urls[numDone])
            .done((data) => {
                try {
                    onLoad(numDone, data);
                    ++numDone;
                    loadNext();
                } catch (e) {
                    onError(e);
                }
            })
            .fail((xhr) => {
                onError(xhr);
            })
    }
};

URLs = [];
$.get(URLReq, function (data) {
    if ($(data).find(".paged-nav-item").length > 0) {
        amountOfPages = parseInt($(data).find(".paged-nav-item")[$(data).find(".paged-nav-item").length - 1].href.match(/page=(\d+)/)[1]);
    }
    else {
        amountOfPages = 0;
    }
    console.log("Amount of pages: " + amountOfPages);
    categoryNames = JSON.parse("[" + $(data).find('script:contains("ScavengeMassScreen")')[0].innerHTML.match(/\{.*\:\{.*\:.*\}\}/g) + "]")[0];
    for (var i = 0; i <= amountOfPages; i++) {
        //push url that belongs to scavenging page i
        URLs.push(URLReq + "&page=" + i);
        //get world data
        tempData = JSON.parse($(data).find('script:contains("ScavengeMassScreen")').html().match(/\{.*\:\{.*\:.*\}\}/g)[0]);
        duration_exponent = tempData[1].duration_exponent;
        duration_factor = tempData[1].duration_factor;
        duration_initial_seconds = tempData[1].duration_initial_seconds;
    }
    console.log(URLs);

})
    .done(function () {
        html = "<div><table class='sophHeader'><tr class='sophHeader'><td class='sophHeader'colspan='5'><h1><center>Mass scavenging overview</center></h1></td></tr><tr class='sophHeader'><td class='sophHeader'>Village</td><td class='sophHeader'>" + categoryNames[1].name + "</td><td class='sophHeader'>" + categoryNames[2].name + "</td><td class='sophHeader'>" + categoryNames[3].name + "</td><td class='sophHeader'>" + categoryNames[4].name + "</td></tr>";
        //here we get all the village data and make an array with it, we won't be able to parse unless we add brackets before and after the string
        arrayWithData = "[";
        $.getAll(URLs,
            (i, here) => {
                thisPageData = $(here).find('script:contains("ScavengeMassScreen")').html().match(/\{.*\:\{.*\:.*\}\}/g)[2];
                arrayWithData += thisPageData + ",";
            },
            () => {
                //on done
                arrayWithData = arrayWithData.substring(0, arrayWithData.length - 1);
                //closing bracket so we can parse the data into a useable array
                arrayWithData += "]";
                scavengeInfo = JSON.parse(arrayWithData);

                //get all the data in a table
                $.each(scavengeInfo, function (villageNr) {
                    if (villageNr % 2 == 0) {
                        rowClass = 'class="sophRowA"'
                    }
                    else {
                        rowClass = 'class="sophRowB"'
                    }
                    html += `<tr ${rowClass}><td class="sophHeader">${scavengeInfo[villageNr].village_name}</td>`;
                    $.each(scavengeInfo[villageNr]["options"], function (villageCategoryNr) {

                        if (scavengeInfo[villageNr]["options"][villageCategoryNr]["scavenging_squad"] != null) {
                            endTime = parseInt(scavengeInfo[villageNr]["options"][villageCategoryNr]["scavenging_squad"]["return_time"]) * 1000;
                            html += `<td ${rowClass}><span class="timer" data-endtime=${parseInt(endTime / 1000)}></span></td>`
                        }
                        else {
                            if (scavengeInfo[villageNr]["options"][villageCategoryNr]["is_locked"] != true) {
                                html += `<td ${rowClass}>No run</td>`
                            }
                            else
                            {
                                html += `<td ${rowClass}>LOCKED</td>`
                            }
                        }
                    })
                    html += "</tr>";
                    totalLootArr.push(getLootedRes(scavengeInfo[villageNr]).reduce((a, b) => a + b, 0));
                })
                html += "</table></div>";
                //$("#contentContainer").eq(0).prepend(html);
                //$("#mobileContent").eq(0).prepend(html);
                var t = `
		<table id="header_info" align="center" width="100%" cellpadding="0"> 
	        	<tbody>
                        	<tr>
					<td class="box-item">Total loot this run: <b class='nowrap'><span class="bonus_icon bonus_icon_8"></span>${totalLootArr.reduce((a, b) => a + b, 0)}</b></td></tr></tbody></table>`;
                $("#contentContainer").eq(0).prepend(t);
                $("#mobileContent").eq(0).prepend(t);
                Timing.tickHandlers.timers.init();
            },
            (error) => {
                console.error(error);
            });
    }
    )
function getLootedRes(data){
    var loot = [];
    
    var wood = 0;
    var stone = 0;
    var iron = 0;
    
    var sumArr = [];
    
    for(var i=1; i <= 4; i++){
        if(data.options[i].scavenging_squad !== null){
            loot.push(data.options[i].scavenging_squad.loot_res);
        } else {
            i++;
        }
    }
    loot.forEach(element => {
      wood += element.wood;
      stone += element.stone;
      iron += element.iron;
    });
    sumArr.push(wood, stone, iron)
    
    return sumArr;
}
