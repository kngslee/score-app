import urllib.request
import csv
text = urllib.request.urlopen('https://raw.githubusercontent.com/datasets/s-and-p-500-companies/master/data/constituents.csv').read().decode('utf-8')
reader = csv.DictReader(text.splitlines())
print(','.join([row['Symbol'] for row in reader]))
