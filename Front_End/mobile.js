
function mobile_detect()
{
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|BB|PlayBook|IEMobile|Windows Phone|Kindle|Silk|Opera Mini/i.test(navigator.userAgent))
    {
        document.getElementById('cover').style.display = "none";
    }
}

mobile_detect();
