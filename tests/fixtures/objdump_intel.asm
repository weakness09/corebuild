0000000000001139 <main>:
    1139:	f3 0f 1e fa          	endbr64 
    113d:	55                   	push   rbp
    113e:	48 89 e5             	mov    rbp,rsp
    1141:	48 83 ec 10          	sub    rsp,0x10
    1145:	c7 45 fc 05 00 00 00 	mov    DWORD PTR [rbp-0x4],0x5
    114c:	83 7d fc 00          	cmp    DWORD PTR [rbp-0x4],0x0
    1150:	7e 0a                	jle    115c <main+0x23>
    1152:	8b 45 fc             	mov    eax,DWORD PTR [rbp-0x4]
    1155:	89 c7                	mov    edi,eax
    1157:	e8 e4 fe ff ff       	call   1040 <fact>
    115c:	b8 00 00 00 00       	mov    eax,0x0
    1161:	c9                   	leave  
    1162:	c3                   	ret    

0000000000001040 <fact>:
    1040:	55                   	push   rbp
    1041:	48 89 e5             	mov    rbp,rsp
    1044:	48 83 ec 10          	sub    rsp,0x10
    1048:	89 7d fc             	mov    DWORD PTR [rbp-0x4],edi
    104b:	83 7d fc 01          	cmp    DWORD PTR [rbp-0x4],0x1
    104f:	7f 07                	jg     1058 <fact+0x18>
    1051:	b8 01 00 00 00       	mov    eax,0x1
    1056:	eb 12                	jmp    106a <fact+0x2a>
    1058:	8b 45 fc             	mov    eax,DWORD PTR [rbp-0x4]
    105b:	83 e8 01             	sub    eax,0x1
    105e:	89 c7                	mov    edi,eax
    1060:	e8 db ff ff ff       	call   1040 <fact>
    1065:	0f af 45 fc          	imul   eax,DWORD PTR [rbp-0x4]
    106a:	c9                   	leave  
    106b:	c3                   	ret    
