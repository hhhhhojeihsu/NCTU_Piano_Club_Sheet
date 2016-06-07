function validateForm()
{
    var week_cht = "日一二三四五六";
    var weekly = 0;
    for(var i = 0; i < 7; ++i)
    {
        var daily = 0;
        for(var j = 0; j <= 23; ++j)
        {
            for(var k = 0; k <= 1; ++k)
            {
                var string = "c";
                string += i + "_" + j + "_" + k;
                var checkbox = document.getElementsByName(string);
                if(checkbox.length !== 0 && checkbox[0].checked)
                {
                    ++weekly;
                    ++daily;
                }
                if(daily > 3)
                {
                    window.alert("您禮拜" + week_cht.substring(Math.floor(i / 2), Math.floor(i / 2) + 1) + "填超過三個囉");
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