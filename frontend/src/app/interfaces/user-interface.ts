export  interface loginData{
    userName: string,
    password: string
}

export  interface forgotPasswordData{
    userName: string,
    email:string
}

export  interface changePasswordData{
    newPassword: string,
    oldPassword:string
}
export  interface deleteUserData{
    user_id: number
}
export interface signupInterface {
  user_id?: number;
  username: string;
  password: string;
  email: string;
  contact_number: string;
  first_name: string;
  last_name: string;
  date_registered?: string | null;
  last_login?: string | null;
  role: string;
  status: number;
}
