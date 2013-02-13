from django import forms

class UploadFileForm(forms.Form):
    time_file  = forms.FileField()
