/*  testing
//key: 19gya1RhjVDeNvHsSUeXSO37KHymcNscoNdEFH3VBecM
*/

$(document).ready(function () {

    //spreadsheet url
    var public_spreadsheet_url = 'https://docs.google.com/spreadsheets/d/19gya1RhjVDeNvHsSUeXSO37KHymcNscoNdEFH3VBecM/pubhtml';
    /*  get spreadsheet */
    Tabletop.init( { key: public_spreadsheet_url,
            callback: showInfo,
            simpleSheet: true })

    function showInfo(data, tabletop)
    {
        alert("Successfully processed!");
        console.log(data);
    }
});