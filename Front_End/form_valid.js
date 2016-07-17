var week_cht = "日一二三四五六";

function validateForm_user()
{

    var weekly = 0;
    for(var i = 0; i < 7; ++i)
    {
        var daily = 0;
        for(var j = 0; j <= 23; ++j)
        {
            var daily_room = 0;
            for(var k = 0; k <= 1; ++k)
            {
                var string = "c";
                string += i + "_" + j + "_" + k;
                var checkbox = document.getElementsByName(string);
                if(checkbox.length !== 0 && checkbox[0].checked)
                {
                    ++weekly;
                    ++daily;
                    ++daily_room;
                }
                else continue;
                if(daily_room > 1)
                {
                    window.alert("您禮拜" + week_cht.substring(i, i + 1) + "同一時段填了兩個，難道您會分身術！？");
                    return false;
                }
                if(daily > 3)
                {
                    window.alert("您禮拜" + week_cht.substring(i, i + 1) + "填超過三個囉");
                    return false;
                }
                else if(weekly > 8)
                {
                    window.alert("您這個禮拜總共填超過8個囉");
                    return false
                }
            }
        }
    }
    return true;
}

function validateForm_admin()
{
    //record is an array of object, each element for user. and object contains its weekly, daily and daily room appointment.
    var record = [];
    for(var i = 0; i < 7; ++i)
    {
        //reference: http://stackoverflow.com/questions/21356880/array-length-returns-0
        //           http://stackoverflow.com/questions/2528680/javascript-array-length-incorrect-on-array-of-objects
        //           http://stackoverflow.com/a/3068720/6007708
        //           http://stackoverflow.com/questions/4255472/javascript-object-access-variable-property-by-name-as-string
        /*  re-initialize all daily's variable  */
        for(var clr = 0; clr < Object.keys(record).length; ++clr)
        {
            record[Object.keys(record)[clr]].daily = 0;
        }
        for(var j = 0; j <= 23; ++j)
        {
            for(var k = 0; k <= 1; ++k)
            {
                var string = "c";
                string += i + "_" + j + "_" + k;
                var input = document.getElementsByName(string);
                if(input[0].value !== "")
                {
                    if(record[input[0].value] === undefined) //found it first time
                    {
                        record[input[0].value] = {weekly: 1, daily: 1, daily_room: 1};
                    }
                    else
                    {
                        ++record[input[0].value].weekly;
                        ++record[input[0].value].daily;
                        ++record[input[0].value].daily_room;
                    }
                }
                else continue;
                if(record[input[0].value].daily > 1)
                {
                    window.alert("'" + input[0].value + "' 禮拜" + week_cht.substring(i, i + 1) + "同一時段填兩個");
                    return false;
                }
                if(record[input[0].value].daily > 3)
                {
                    window.alert("'" + input[0].value + "' 禮拜" + week_cht.substring(i, i + 1) + "填超過三個");
                    return false;
                }
                else if(record[input[0].value].weekly > 8)
                {
                    window.alert("'" + input[0].value + "' 這個禮拜總共填超過8個");
                    return false;
                }
            }
        }
    }
    return true;
}