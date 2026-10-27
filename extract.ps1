$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open("c:\Daily\Work\Projects\Bhumee website\Birthday_Website_Plan.docx")
$text = $doc.Content.Text
$doc.Close()
$word.Quit()
$text | Out-File -FilePath "c:\Daily\Work\Projects\Bhumee website\plan_text.txt" -Encoding UTF8

