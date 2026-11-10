exports.approvedLineAdmin=token=>token?.line_login===true&&token?.line_admin===true&&token?.admin===true&&token?.firebase?.sign_in_provider==='custom';
exports.applicantOnly=token=>(token?.line_login===true||token?.firebase?.sign_in_provider==='custom')&&!exports.approvedLineAdmin(token);
