table1 = {true, nil, true, false, nil, true, nil}
table2 = {true, false, nil, false, nil, true, nil}

print ("table1:", unpack(table1))
print ("table2:", unpack(table2))

print (table.getn(table1), #table1)
print (table.getn(table2), #table2)
